"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePlacement, type MutationState } from "@/app/placement/actions";
import { academicYearFor, type Row } from "@/features/placement/lib/types";

export function ChangeForm({
  action,
  base = {},
  children,
  submit = "Save",
  destination,
  destructive = false,
}: {
  action: string;
  base?: Row;
  children?: React.ReactNode;
  submit?: string;
  destination?: string;
  destructive?: boolean;
}) {
  const router = useRouter(),
    request = useRef<{ key: string; payload: string } | null>(null);
  const [state, dispatch, pending] = useActionState(
    async (prev: MutationState, form: FormData) => {
      const payload: Row = { ...base };
      for (const [key, value] of form.entries())
        if (typeof value === "string" && !key.startsWith("$ACTION_"))
          payload[key] = value;
      for (const key of ["branches", "student_ids", "registration_ids"])
        if (form.has(key)) payload[key] = form.getAll(key).map(String);
      if (form.has("rounds"))
        payload.rounds = String(form.get("rounds"))
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean);
      if (form.has("job_categories_present")) {
        payload.job_categories = form.getAll("job_categories").map(String);
        delete payload.job_categories_present;
      }
      if (form.has("published_present")) {
        payload.published = form.has("published");
        delete payload.published_present;
      }
      if (form.has("active_present")) {
        payload.active = form.has("active");
        delete payload.active_present;
      }
      if (form.has("override_interest")) payload.override_interest = true;
      const serialized = JSON.stringify(payload);
      if (request.current?.payload !== serialized)
        request.current = { key: crypto.randomUUID(), payload: serialized };
      const data = new FormData();
      data.set("action", action);
      data.set("request_id", request.current.key);
      data.set("payload", serialized);
      if (destructive && destination && !destination.includes(":id"))
        data.set("redirect", destination);
      const result = await changePlacement(prev, data);
      if (!result.error) request.current = null;
      return result;
    },
    { error: "" },
  );
  useEffect(() => {
    if (state.success) {
      if (destination) router.push(destination.replace(":id", state.id || ""));
      else router.refresh();
    }
  }, [state, destination, router]);
  return (
    <form action={dispatch} className="po-form">
      <fieldset disabled={pending}>
        {children}
        <div className="po-form-actions">
          <button className={destructive ? "po-danger" : "erp-primary"}>
            {pending ? "Saving…" : submit}
          </button>
          <p
            role="status"
            aria-live="polite"
            className={state.error ? "erp-form-error" : "erp-muted"}
          >
            {state.error || state.success}
          </p>
        </div>
      </fieldset>
    </form>
  );
}
/**
 * Academic year and passing-out batch for the drive form. A new drive's
 * academic year follows the chosen batch until the officer types their own;
 * a saved (or PDF-suggested) academic year is never replaced.
 */
export function AcademicYearBatch({
  academicYear,
  batch,
  batches,
}: {
  academicYear: string;
  batch: string;
  batches: string[];
}) {
  const [year, setYear] = useState(academicYear || academicYearFor(batch)),
    custom = useRef(!!academicYear);
  return (
    <>
      <label>
        Academic year · required
        <input
          name="academic_year"
          pattern="20[0-9]{2}-([0-9]{2}|20[0-9]{2})"
          placeholder="e.g. 2026-27"
          required
          value={year}
          onChange={(e) => {
            custom.current = e.target.value.trim() !== "";
            setYear(e.target.value);
          }}
        />
      </label>
      <label>
        Passing-out batch
        <select
          aria-label="Passing-out batch"
          name="batch"
          required
          defaultValue={batch}
          onChange={(e) => {
            if (!custom.current) setYear(academicYearFor(e.target.value));
          }}
        >
          <option value="">Select batch</option>
          {batches.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
    </>
  );
}
export function RoundsInput({
  initial = ["Online test"],
}: {
  initial?: string[];
}) {
  const [rounds, setRounds] = useState(initial);
  const move = (index: number, delta: number) => {
    setRounds((old) => {
      const next = [...old];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  };
  return (
    <div className="po-round-editor">
      <span className="po-field-label">Recruitment rounds, in order</span>
      <input type="hidden" name="rounds" value={rounds.join("\n")} />
      {rounds.map((round, index) => (
        <div key={index}>
          <span>{index + 1}.</span>
          <input
            aria-label={`Round ${index + 1} name`}
            value={round}
            maxLength={100}
            required
            onChange={(e) =>
              setRounds((old) =>
                old.map((v, i) => (i === index ? e.target.value : v)),
              )
            }
          />
          <button
            type="button"
            disabled={index === 0}
            onClick={() => move(index, -1)}
            aria-label={`Move round ${index + 1} up`}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === rounds.length - 1}
            onClick={() => move(index, 1)}
            aria-label={`Move round ${index + 1} down`}
          >
            ↓
          </button>
          <button
            type="button"
            disabled={rounds.length === 1}
            onClick={() =>
              setRounds((old) => old.filter((_, i) => i !== index))
            }
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="erp-secondary"
        disabled={rounds.length >= 20}
        onClick={() => setRounds((old) => [...old, ""])}
      >
        Add round
      </button>
    </div>
  );
}
export function Refresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="erp-secondary"
        disabled={pending}
        aria-busy={pending}
        onClick={() => startTransition(() => router.refresh())}
    >
        {pending ? "Refreshing…" : "Refresh ↻"}
    </button>
  );
}
export function DeleteRecord({
  kind,
  record,
  back,
}: {
  kind: "company" | "drive";
  record: Row;
  back: string;
}) {
  const name = String(record.name || record.title);
  return (
    <details className="po-delete">
      <summary>Delete {kind} and associated records</summary>
      <p>
        This permanently removes this {kind} and its linked drives,
        registrations, round results and offers. Type <strong>{name}</strong> to
        confirm.
      </p>
      <ChangeForm
        action={`${kind}.delete`}
        base={{ id: record.id, revision: record.revision }}
        destination={back}
        destructive
        submit={`Delete ${kind}`}
      >
        <label>
          Confirmation
          <input name="confirmation" required autoComplete="off" />
        </label>
      </ChangeForm>
    </details>
  );
}
