import "server-only";
import { backendApi } from "@/shared/http/backend";

// Officer F.R.I.D.A.Y. runs in this web app, so it reports its own trace to the
// backend (POST /ops/traces). Steps are batched after each tool round and at
// the end; writes are chained and never awaited by the answer stream, so a
// slow or failed trace write cannot delay or break F.R.I.D.A.Y.
// Only the allowlisted metadata below is sent; the backend filters it again.

type Status = "running" | "completed" | "failed" | "skipped" | "denied";
type Step = {
  seq: number;
  parent_seq?: number;
  node: string;
  kind: string;
  label: string;
  status: Status;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  error_category?: string;
  meta: Record<string, string | number | boolean>;
};
export type TraceHandle = { seq: number; end: (status: Status, meta?: Step["meta"], errorCategory?: string) => void };
export type FridayTrace = {
  open: (node: string, kind: string, label: string, parent?: number) => TraceHandle;
  record: (node: string, kind: string, label: string, status: Status, meta?: Step["meta"], errorCategory?: string) => void;
  span: (node: string, kind: string, label: string, status: Status, started: Date, ended: Date, meta?: Step["meta"]) => void;
  flush: () => void;
  finish: (status: "completed" | "failed" | "denied", errorCategory?: string) => Promise<void>;
};

const clean = (meta: Step["meta"] = {}) =>
  Object.fromEntries(
    Object.entries(meta)
      .filter(([, v]) => typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v)) || typeof v === "string")
      .map(([k, v]) => [k.slice(0, 40), typeof v === "string" ? v.slice(0, 60) : v]),
  );

/** Starts an officer FRIDAY trace. Disabled silently when the backend refuses. */
export function startOfficerTrace(session: { token: string }, summary: Step["meta"] = {}): FridayTrace {
  const id = crypto.randomUUID();
  const steps = new Map<number, Step>();
  const dirty = new Set<number>();
  let seq = 0;
  let enabled = true;
  let chain: Promise<unknown> = backendApi("/ops/traces", {
    method: "POST",
    body: JSON.stringify({ id, assistant: "officer", startedAt: new Date().toISOString(), summary: clean(summary) }),
    session,
    timeoutMs: 5000,
  }).catch(() => {
    enabled = false;
  });
  const send = (finish?: { status: string; error_category?: string }) => {
    const batch = [...dirty].map((n) => steps.get(n)!).filter(Boolean);
    dirty.clear();
    if (!batch.length && !finish) return chain;
    chain = chain.then(() =>
      enabled
        ? backendApi(`/ops/traces/${id}/steps`, {
            method: "POST",
            body: JSON.stringify({ steps: batch, ...(finish ? { finish } : {}) }),
            session,
            timeoutMs: 5000,
          }).catch(() => undefined)
        : undefined,
    );
    return chain;
  };
  const add = (step: Omit<Step, "seq">) => {
    seq += 1;
    if (seq > 100) return { ...step, seq };
    const full = { ...step, seq };
    steps.set(seq, full);
    dirty.add(seq);
    return full;
  };
  return {
    open(node, kind, label, parent) {
      const started = new Date();
      const step = add({ node, kind, label, status: "running", started_at: started.toISOString(), meta: {}, ...(parent ? { parent_seq: parent } : {}) });
      return {
        seq: step.seq,
        end(status, meta = {}, errorCategory) {
          const ended = new Date();
          Object.assign(step, {
            status,
            ended_at: ended.toISOString(),
            duration_ms: Math.max(0, ended.getTime() - started.getTime()),
            meta: clean(meta),
            ...(errorCategory ? { error_category: errorCategory } : {}),
          });
          if (steps.has(step.seq)) dirty.add(step.seq);
        },
      };
    },
    record(node, kind, label, status, meta = {}, errorCategory) {
      const now = new Date().toISOString();
      add({ node, kind, label, status, started_at: now, ended_at: now, duration_ms: 0, meta: clean(meta), ...(errorCategory ? { error_category: errorCategory } : {}) });
    },
    span(node, kind, label, status, started, ended, meta = {}) {
      add({ node, kind, label, status, started_at: started.toISOString(), ended_at: ended.toISOString(),
        duration_ms: Math.max(0, ended.getTime() - started.getTime()), meta: clean(meta) });
    },
    flush() {
      void send();
    },
    async finish(status, errorCategory) {
      await send({ status, ...(errorCategory ? { error_category: errorCategory } : {}) });
    },
  };
}

/** Coarse error category for a failed tool, never its message. */
export function toolErrorCategory(error: string) {
  if (/not valid JSON/i.test(error)) return "invalid_arguments";
  if (/took too long/i.test(error)) return "timeout";
  if (/access|permission|forbidden/i.test(error)) return "forbidden";
  if (/not found|not present/i.test(error)) return "not_found";
  return "tool_error";
}
