"use client";
import { useEffect, useRef, useState } from "react";
import { Search, UserMinus, UserPlus, Undo2 } from "lucide-react";
import { previewAudience, searchStudents } from "@/app/placement/company-actions";
import type { AudiencePreview, AudienceSpec, AudienceStudent } from "@/features/placement/lib/company-types";

const score = (value: number | null) => (value === null || value === undefined ? "Not scored" : Number(value).toFixed(1));

/**
 * Choose who receives a drive: rule filters (batches, branches, CGPA, backlogs,
 * attendance), then individual additions and removals. The preview is the
 * exact list the database will store when the officer confirms.
 */
export function AudienceBuilder({
  options,
  value,
  onChange,
  onPreview,
}: {
  options: { batches: string[]; departments: string[] };
  value: AudienceSpec;
  onChange: (spec: AudienceSpec) => void;
  onPreview?: (preview: AudiencePreview | null) => void;
}) {
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<AudienceStudent[]>([]);
  const [searching, setSearching] = useState(false);
  const [names, setNames] = useState<Record<string, AudienceStudent>>({});
  const sequence = useRef(0);

  useEffect(() => {
    if (!value.batches.length) {
      setPreview(null);
      onPreview?.(null);
      return;
    }
    const current = ++sequence.current;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const result = await previewAudience(value, filter);
      if (current !== sequence.current) return;
      setLoading(false);
      if (result.ok) {
        setPreview(result.data);
        onPreview?.(result.data);
        setError("");
        setNames((known) => ({ ...known, ...Object.fromEntries(result.data.rows.map((row) => [row.id, row])) }));
      } else setError(result.error);
    }, 350);
    return () => window.clearTimeout(timer);
    // onPreview is a notification callback; re-running for its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, filter]);

  const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item].sort());
  const set = (patch: Partial<AudienceSpec>) => onChange({ ...value, ...patch });
  const include = (student: AudienceStudent) => {
    setNames((known) => ({ ...known, [student.id]: student }));
    if (value.remove.includes(student.id)) set({ remove: value.remove.filter((id) => id !== student.id) });
    else if (!value.add.includes(student.id)) set({ add: [...value.add, student.id] });
  };
  const exclude = (student: AudienceStudent) => {
    setNames((known) => ({ ...known, [student.id]: student }));
    if (value.add.includes(student.id)) set({ add: value.add.filter((id) => id !== student.id) });
    else if (!value.remove.includes(student.id)) set({ remove: [...value.remove, student.id] });
  };
  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (term.trim().length < 2) return setFound([]);
    setSearching(true);
    const result = await searchStudents(term.trim());
    setSearching(false);
    if (result.ok) setFound(result.data);
    else setError(result.error);
  };
  const inAudience = new Set(preview?.rows.map((row) => row.id));
  const numberField = (key: "min_cgpa" | "max_backlogs" | "min_attendance", label: string, attrs: { min: number; max: number; step: number }) => (
    <label>
      {label}
      <input
        type="number"
        inputMode="decimal"
        {...attrs}
        value={value[key] ?? ""}
        placeholder="No limit"
        onChange={(event) => set({ [key]: event.target.value === "" ? "" : Number(event.target.value) } as Partial<AudienceSpec>)}
      />
    </label>
  );

  return (
    <div className="cp-audience">
      <div className="cp-audience-rules">
        <fieldset>
          <legend>Graduating batches</legend>
          <div className="cp-toggles">
            {options.batches.map((batch) => (
              <label key={batch} className="cp-toggle">
                <input type="checkbox" checked={value.batches.includes(batch)} onChange={() => set({ batches: toggle(value.batches, batch) })} />
                <span>{batch}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Branches {value.branches.length ? `(${value.branches.length})` : "(all)"}</legend>
          <div className="cp-toggles">
            {options.departments.map((department) => (
              <label key={department} className="cp-toggle">
                <input
                  type="checkbox"
                  checked={value.branches.includes(department)}
                  onChange={() => set({ branches: toggle(value.branches, department) })}
                />
                <span>{department}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="cp-limits">
          {numberField("min_cgpa", "Minimum CGPA", { min: 0, max: 10, step: 0.01 })}
          {numberField("max_backlogs", "Maximum current backlogs", { min: 0, max: 100, step: 1 })}
          {numberField("min_attendance", "Minimum attendance (%)", { min: 0, max: 100, step: 0.1 })}
        </div>
      </div>

      <section className="cp-audience-pick" aria-labelledby="cp-pick-title">
        <h3 id="cp-pick-title">Add or remove individual students</h3>
        <p className="erp-muted">
          Search by name or USN. Students added here receive the drive even if they fall outside the filters. DSA, GitHub and developer
          scores come from Students Ranking.
        </p>
        <form className="cp-search" onSubmit={search} role="search">
          <Search size={15} aria-hidden="true" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Name or USN" maxLength={100} aria-label="Search students" />
          <button className="erp-secondary" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
        </form>
        {found.length > 0 && (
          <ul className="cp-found">
            {found.map((student) => {
              const included = value.add.includes(student.id) || (inAudience.has(student.id) && !value.remove.includes(student.id));
              return (
                <li key={student.id}>
                  <div>
                    <strong>{student.name}</strong>
                    <span>
                      {student.usn} · {student.department || "No branch"} · {student.batch} · CGPA {student.cgpa ?? "missing"}
                    </span>
                    <span className="cp-scores">
                      DSA {score(student.dsa)} · GitHub {score(student.github)} · Developer {score(student.developer)}
                    </span>
                  </div>
                  {included ? (
                    <button type="button" className="erp-secondary" onClick={() => exclude(student)}>
                      <UserMinus size={14} aria-hidden="true" /> Remove
                    </button>
                  ) : (
                    <button type="button" className="erp-secondary" onClick={() => include(student)}>
                      <UserPlus size={14} aria-hidden="true" /> Add
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {(value.add.length > 0 || value.remove.length > 0) && (
          <div className="cp-overrides">
            {value.add.length > 0 && (
              <p>
                <strong>Added by hand:</strong>{" "}
                {value.add.map((id) => (
                  <span key={id} className="cp-override">
                    {names[id] ? `${names[id].name} (${names[id].usn})` : "Selected student"}
                    <button type="button" aria-label="Undo addition" onClick={() => set({ add: value.add.filter((x) => x !== id) })}>
                      <Undo2 size={12} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </p>
            )}
            {value.remove.length > 0 && (
              <p>
                <strong>Removed:</strong>{" "}
                {value.remove.map((id) => (
                  <span key={id} className="cp-override">
                    {names[id] ? `${names[id].name} (${names[id].usn})` : "Selected student"}
                    <button type="button" aria-label="Undo removal" onClick={() => set({ remove: value.remove.filter((x) => x !== id) })}>
                      <Undo2 size={12} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="cp-audience-preview" aria-labelledby="cp-preview-title" aria-busy={loading || undefined}>
        <div className="erp-section-heading">
          <h3 id="cp-preview-title">Final audience</h3>
          <span className="cp-audience-total" aria-live="polite">
            {!value.batches.length ? "Choose a batch" : loading && !preview ? "Counting…" : preview ? `${preview.total} student${preview.total === 1 ? "" : "s"}` : ""}
          </span>
        </div>
        {error && <p className="erp-form-error" role="alert">{error}</p>}
        {preview && (
          <>
            <p className="erp-muted">
              {preview.byDepartment.map((d) => `${d.department} ${d.students}`).join(" · ") || "No students match."}
              {preview.added ? ` · ${preview.added} added by hand` : ""}
              {preview.removed ? ` · ${preview.removed} removed` : ""}
            </p>
            <input
              className="cp-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find someone in this audience"
              aria-label="Find someone in this audience"
              maxLength={100}
            />
            {preview.rows.length ? (
              <div className="erp-table-scroll" tabIndex={0} role="region" aria-label="Audience preview">
                <table className="erp-table po-table">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Branch</th>
                      <th scope="col">Batch</th>
                      <th scope="col">CGPA</th>
                      <th scope="col">Backlogs</th>
                      <th scope="col">DSA</th>
                      <th scope="col">Developer</th>
                      <th scope="col"><span className="erp-visually-hidden">Change</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.name}
                          <br />
                          <small className="erp-muted">{row.usn}{row.source === "added" ? " · added by hand" : ""}</small>
                        </td>
                        <td>{row.department || "None"}</td>
                        <td>{row.batch}</td>
                        <td>{row.cgpa ?? "Missing"}</td>
                        <td>{row.backlogs ?? "Missing"}</td>
                        <td>{score(row.dsa)}</td>
                        <td>{score(row.developer)}</td>
                        <td>
                          <button type="button" className="cp-row-action" onClick={() => exclude(row)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="erp-muted">{filter ? "No one in this audience matches that search." : "No students match these filters."}</p>
            )}
            {preview.matching > preview.rows.length && (
              <p className="erp-muted">Showing {preview.rows.length} of {preview.matching}. Use the search above to find a specific student.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** Starting audience from a drive's saved rules, or the company's requested criteria. */
export function initialSpec(source: {
  batches?: string[] | null;
  branches?: string[] | null;
  min_cgpa?: number | string | null;
  max_backlogs?: number | string | null;
  min_attendance?: number | string | null;
} | null, changes?: { add: string[]; remove: string[] } | null): AudienceSpec {
  const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? "" : Number(v));
  return {
    batches: source?.batches ?? [],
    branches: source?.branches ?? [],
    min_cgpa: num(source?.min_cgpa),
    max_backlogs: num(source?.max_backlogs),
    min_attendance: num(source?.min_attendance),
    add: changes?.add ?? [],
    remove: changes?.remove ?? [],
  };
}
