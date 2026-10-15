// Pure presentation helpers for the F.R.I.D.A.Y. interface. No React, no DOM,
// no server imports, so every rule here is unit tested directly.

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

export type Block =
  | { kind: "paragraph"; inline: Inline[] }
  | { kind: "heading"; inline: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "table"; head: Inline[][]; rows: Inline[][][]; align: Align[] };

export type Align = "left" | "right" | "center" | null;

// Only links into this workspace become clickable. Anything else is shown as
// plain text, so model output can never send an officer to an outside site.
const INTERNAL = /^\/placement\/[A-Za-z0-9/_?=&.-]*$/;

const INLINE =
  /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(\/placement\/[A-Za-z0-9/_-]+)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    if (m[1] !== undefined) out.push({ kind: "strong", text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: "code", text: m[2] });
    else if (m[3] !== undefined && m[4] !== undefined)
      out.push(
        INTERNAL.test(m[4])
          ? { kind: "link", text: m[3], href: m[4] }
          : { kind: "text", text: m[3] },
      );
    else if (m[5] !== undefined)
      out.push({ kind: "link", text: m[5], href: m[5] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => parseInline(c.trim()));

/** Column alignment from a separator row such as |---|---:|:---:|. */
function alignments(rule: string): Align[] {
  return rule
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => {
      const t = c.trim();
      const left = t.startsWith(":"),
        right = t.endsWith(":");
      return left && right ? "center" : right ? "right" : left ? "left" : null;
    });
}

const isRule = (line: string) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);

/** Parse the Markdown subset the model actually produces into safe blocks. */
export function parseAnswer(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ kind: "paragraph", inline: parseInline(para.join("\n")) });
      para = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      continue;
    }

    // Pipe table: a header row followed by a separator rule.
    if (trimmed.startsWith("|") && i + 1 < lines.length && isRule(lines[i + 1])) {
      flush();
      const head = cells(trimmed);
      const align = alignments(lines[i + 1]);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(cells(lines[i]));
        i++;
      }
      i--;
      blocks.push({ kind: "table", head, rows, align });
      continue;
    }

    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", inline: parseInline(heading[1]) });
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const items: Inline[][] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const m = ordered ? t.match(/^\d+[.)]\s+(.*)$/) : t.match(/^[-*•]\s+(.*)$/);
        if (!m) break;
        items.push(parseInline(m[1]));
        i++;
      }
      i--;
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    para.push(trimmed);
  }
  flush();
  return blocks;
}

export type ConversationGroup<T> = { label: string; items: T[] };

/** Group conversations into Today, Yesterday, Previous 7 days and Older. */
export function groupConversations<T extends { updated_at?: unknown; created_at?: unknown }>(
  rows: T[],
  now: Date,
): ConversationGroup<T>[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const order = ["Today", "Yesterday", "Previous 7 days", "Older"];
  const groups = new Map<string, T[]>(order.map((l) => [l, []]));
  for (const row of rows) {
    const raw = row.updated_at ?? row.created_at;
    const at = typeof raw === "string" ? Date.parse(raw) : NaN;
    const label = Number.isNaN(at)
      ? "Older"
      : at >= startOfToday
        ? "Today"
        : at >= startOfToday - day
          ? "Yesterday"
          : at >= startOfToday - 7 * day
            ? "Previous 7 days"
            : "Older";
    groups.get(label)!.push(row);
  }
  return order
    .map((label) => ({ label, items: groups.get(label)! }))
    .filter((g) => g.items.length > 0);
}

/**
 * The batch the starter prompts refer to: the earliest batch that has not yet
 * graduated, which is the one placement work is focused on. Falls back to the
 * newest batch on record, and to null when there are none.
 */
export function focusBatch(batches: string[], year: number): string | null {
  const valid = batches.filter((b) => /^20\d{2}$/.test(b)).map(Number).sort((a, b) => a - b);
  if (!valid.length) return null;
  const upcoming = valid.find((b) => b >= year);
  return String(upcoming ?? valid[valid.length - 1]);
}

/** Human duration for measured timings, e.g. 950 ms -> "0.9 s". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m} min ${s} s`;
}
