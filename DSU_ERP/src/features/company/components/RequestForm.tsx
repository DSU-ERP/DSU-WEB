"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { companyFetch, readBase64 } from "../lib/client";
import type { CompanyRequest } from "../lib/types";

type Form = {
  title: string;
  description: string;
  job_category: string;
  employment_type: string;
  openings: string;
  package_lpa: string;
  ctc_fixed_lpa: string;
  ctc_variable_lpa: string;
  stipend_monthly: string;
  internship_months: string;
  bond_months: string;
  bond_details: string;
  work_mode: string;
  joining_date: string;
  location: string;
  skills: string;
  required_documents: string;
  rounds: string[];
  drive_date: string;
  registration_deadline: string;
  batches: string[];
  branches: string;
  min_cgpa: string;
  max_backlogs: string;
  min_attendance: string;
  notes: string;
  jd_file_id: string;
};
const str = (value: unknown) => (value === null || value === undefined ? "" : String(value));
function fromRequest(r: CompanyRequest | null): Form {
  const c = r?.criteria || {};
  return {
    title: str(r?.title), description: str(r?.description), job_category: str(r?.job_category), employment_type: str(r?.employment_type),
    openings: str(r?.openings), package_lpa: str(r?.package_lpa), ctc_fixed_lpa: str(r?.ctc_fixed_lpa), ctc_variable_lpa: str(r?.ctc_variable_lpa),
    stipend_monthly: str(r?.stipend_monthly), internship_months: str(r?.internship_months), bond_months: str(r?.bond_months),
    bond_details: str(r?.bond_details), work_mode: str(r?.work_mode), joining_date: str(r?.joining_date), location: str(r?.location),
    skills: str(r?.skills), required_documents: str(r?.required_documents), rounds: r?.rounds?.length ? [...r.rounds] : [""],
    drive_date: str(r?.drive_date), registration_deadline: str(r?.registration_deadline), batches: c.batches || [],
    branches: (c.branches || []).join(", "), min_cgpa: str(c.min_cgpa), max_backlogs: str(c.max_backlogs),
    min_attendance: str(c.min_attendance), notes: str(c.notes), jd_file_id: str(r?.jd_file_id),
  };
}
const num = (value: string) => (value.trim() === "" ? "" : Number(value));
function payload(form: Form) {
  return {
    title: form.title.trim(), description: form.description, job_category: form.job_category.trim(),
    employment_type: form.employment_type, openings: num(form.openings), package_lpa: num(form.package_lpa),
    ctc_fixed_lpa: num(form.ctc_fixed_lpa), ctc_variable_lpa: num(form.ctc_variable_lpa), stipend_monthly: num(form.stipend_monthly),
    internship_months: num(form.internship_months), bond_months: num(form.bond_months), bond_details: form.bond_details.trim(),
    work_mode: form.work_mode, joining_date: form.joining_date, location: form.location.trim(), skills: form.skills.trim(),
    required_documents: form.required_documents.trim(), rounds: form.rounds.map((r) => r.trim()).filter(Boolean),
    drive_date: form.drive_date, registration_deadline: form.registration_deadline,
    criteria: {
      batches: form.batches,
      branches: form.branches.split(",").map((b) => b.trim()).filter(Boolean),
      ...(form.min_cgpa.trim() ? { min_cgpa: Number(form.min_cgpa) } : {}),
      ...(form.max_backlogs.trim() ? { max_backlogs: Number(form.max_backlogs) } : {}),
      ...(form.min_attendance.trim() ? { min_attendance: Number(form.min_attendance) } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    },
    jd_file_id: form.jd_file_id || "",
  };
}

/** Create or edit a drive request. Drafts can be saved incomplete; submitting checks every required field. */
export function RequestForm({ request, driveTitle }: { request: CompanyRequest | null; driveTitle?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => fromRequest(request));
  const [saved, setSaved] = useState(request);
  const [jdName, setJdName] = useState(request?.jd_file?.filename || "");
  const [busy, setBusy] = useState<"" | "save" | "submit" | "upload">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return [...new Set([...[0, 1, 2, 3].map((n) => String(now + n)), ...form.batches])].sort();
  }, [form.batches]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const internship = form.employment_type === "internship" || form.employment_type === "internship-ppo";

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || file.size > 10 * 1024 * 1024) return setError("Choose a PDF of 10 MB or less.");
    setBusy("upload");
    setError("");
    setWarnings([]);
    try {
      const result = await companyFetch<{
        file: { id: string; filename: string };
        fields: Partial<ReturnType<typeof payload>> | null;
        warnings: string[];
      }>("files", { method: "POST", body: { filename: file.name, data: await readBase64(file), parse: true } });
      setJdName(result.file.filename);
      setForm((current) => {
        const next = { ...current, jd_file_id: result.file.id };
        const f = result.fields;
        if (!f) return next;
        // Suggestions only fill empty fields; anything already typed is kept.
        const fill = (key: keyof Form, value: unknown) => {
          if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) return;
          const empty = Array.isArray(next[key]) ? !(next[key] as string[]).some((v) => v.trim()) : !String(next[key]).trim();
          if (empty) (next as Record<string, unknown>)[key] = Array.isArray(value) ? value.map(String) : String(value);
        };
        for (const key of ["title", "description", "job_category", "employment_type", "openings", "package_lpa", "location", "skills", "required_documents", "drive_date", "registration_deadline", "rounds"] as const)
          fill(key, f[key as keyof typeof f]);
        if (f.criteria) {
          fill("branches", f.criteria.branches?.join(", "));
          fill("min_cgpa", f.criteria.min_cgpa);
          fill("max_backlogs", f.criteria.max_backlogs);
        }
        return next;
      });
      setWarnings(result.warnings || []);
      setNotice(result.fields ? "We filled the empty fields from your PDF. Check every value before submitting." : "PDF attached.");
      setDirty(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const save = async (): Promise<CompanyRequest | null> => {
    const result = await companyFetch<CompanyRequest>("requests", {
      method: "POST",
      body: {
        ...(saved ? { id: saved.id, revision: saved.revision } : {}),
        ...payload(form),
      },
    });
    setSaved(result);
    setDirty(false);
    return result;
  };
  const run = async (submit: boolean) => {
    setBusy(submit ? "submit" : "save");
    setError("");
    setNotice("");
    try {
      const result = dirty || !saved ? await save() : saved;
      if (!result) return;
      if (submit) {
        await companyFetch(`requests/${result.id}/submit`, { method: "POST", body: {} });
        router.push(`/company/requests/${result.id}?submitted=1`);
        router.refresh();
        return;
      }
      setNotice("Draft saved.");
      if (!request) router.replace(`/company/requests/${result.id}`);
      else router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const round = (index: number, value: string) => set("rounds", form.rounds.map((r, i) => (i === index ? value : r)));
  const move = (index: number, by: number) => {
    const next = [...form.rounds];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    set("rounds", next);
  };

  return (
    <form
      className="cp-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run(true);
      }}
    >
      {driveTitle && (
        <p className="cp-note">
          You are proposing changes to the live drive <strong>{driveTitle}</strong>. Students keep seeing the current details until the placement
          office approves your changes.
        </p>
      )}
      <fieldset>
        <legend>Job description PDF</legend>
        <p className="cp-hint">Upload the JD or drive brochure. We attach it for the placement office and students, and fill the empty fields below from it.</p>
        <div className="cp-upload">
          <label className="erp-secondary" style={{ cursor: "pointer" }}>
            <Upload size={14} aria-hidden="true" />
            &nbsp;{busy === "upload" ? "Reading the PDF…" : jdName ? "Replace PDF" : "Upload PDF"}
            <input type="file" accept="application/pdf,.pdf" hidden disabled={!!busy} onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
          {jdName && <span className="erp-muted">Attached: {jdName}</span>}
        </div>
        {warnings.length > 0 && (
          <ul className="cp-warnings">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset>
        <legend>The role</legend>
        <div className="cp-grid">
          <label className="cp-wide">
            Role title *
            <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="e.g. Graduate Software Engineer" />
          </label>
          <label>
            Employment type *
            <select value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
              <option value="">Choose</option>
              <option value="full-time">Full-time</option>
              <option value="internship">Internship</option>
              <option value="internship-ppo">Internship with pre-placement offer</option>
              <option value="contract">Contract</option>
            </select>
          </label>
          <label>
            Job category or domain
            <input value={form.job_category} onChange={(e) => set("job_category", e.target.value)} maxLength={100} placeholder="e.g. Software, Data, Core electronics" />
          </label>
          <label>
            Number of openings *
            <input type="number" min={1} max={99999} step={1} value={form.openings} onChange={(e) => set("openings", e.target.value)} />
          </label>
          <label className="cp-wide">
            Job description
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={12000} rows={6} placeholder="Responsibilities, team and what a typical week looks like." />
            <span className="cp-hint">Required unless you attach a JD PDF.</span>
          </label>
          <label className="cp-wide">
            Skills you are looking for
            <textarea value={form.skills} onChange={(e) => set("skills", e.target.value)} maxLength={2000} rows={2} placeholder="e.g. Java, SQL, data structures and algorithms" />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Compensation</legend>
        <div className="cp-grid">
          <label>
            Total CTC (LPA) *
            <input type="number" min={0} max={10000} step={0.01} value={form.package_lpa} onChange={(e) => set("package_lpa", e.target.value)} />
          </label>
          <label>
            Fixed pay (LPA)
            <input type="number" min={0} max={10000} step={0.01} value={form.ctc_fixed_lpa} onChange={(e) => set("ctc_fixed_lpa", e.target.value)} />
          </label>
          <label>
            Variable pay (LPA)
            <input type="number" min={0} max={10000} step={0.01} value={form.ctc_variable_lpa} onChange={(e) => set("ctc_variable_lpa", e.target.value)} />
          </label>
          {internship && (
            <>
              <label>
                Stipend per month (₹) *
                <input type="number" min={0} max={10000000} step={1} value={form.stipend_monthly} onChange={(e) => set("stipend_monthly", e.target.value)} />
              </label>
              <label>
                Internship length (months)
                <input type="number" min={1} max={36} step={1} value={form.internship_months} onChange={(e) => set("internship_months", e.target.value)} />
              </label>
            </>
          )}
          <label>
            Bond or service agreement (months)
            <input type="number" min={0} max={120} step={1} value={form.bond_months} onChange={(e) => set("bond_months", e.target.value)} placeholder="0 if there is none" />
          </label>
          <label className="cp-wide">
            Bond details
            <input value={form.bond_details} onChange={(e) => set("bond_details", e.target.value)} maxLength={2000} placeholder="e.g. Penalty if leaving within the first year" />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Work and joining</legend>
        <div className="cp-grid">
          <label>
            Work mode *
            <select value={form.work_mode} onChange={(e) => set("work_mode", e.target.value)}>
              <option value="">Choose</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </label>
          <label>
            Location
            <input value={form.location} onChange={(e) => set("location", e.target.value)} maxLength={200} placeholder="e.g. Bengaluru" />
          </label>
          <label>
            Expected joining date
            <input type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Selection process and dates</legend>
        <div className="cp-rounds">
          {form.rounds.map((value, index) => (
            <div key={index}>
              <span>{index + 1}.</span>
              <input value={value} onChange={(e) => round(index, e.target.value)} maxLength={100} placeholder="e.g. Online test" aria-label={`Round ${index + 1}`} />
              <button type="button" className="cp-icon-button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp size={14} aria-hidden="true" />
              </button>
              <button type="button" className="cp-icon-button" aria-label="Move down" disabled={index === form.rounds.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown size={14} aria-hidden="true" />
              </button>
              <button type="button" className="cp-icon-button" aria-label={`Remove round ${index + 1}`} disabled={form.rounds.length === 1} onClick={() => set("rounds", form.rounds.filter((_, i) => i !== index))}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
          {form.rounds.length < 20 && (
            <button type="button" className="erp-secondary" style={{ justifySelf: "start" }} onClick={() => set("rounds", [...form.rounds, ""])}>
              <Plus size={14} aria-hidden="true" />
              &nbsp;Add a round
            </button>
          )}
        </div>
        <div className="cp-grid" style={{ marginTop: "1rem" }}>
          <label>
            Applications close on
            <input type="date" value={form.registration_deadline} onChange={(e) => set("registration_deadline", e.target.value)} />
          </label>
          <label>
            Drive date
            <input type="date" value={form.drive_date} onChange={(e) => set("drive_date", e.target.value)} />
          </label>
          <label className="cp-wide">
            Documents students should bring
            <input value={form.required_documents} onChange={(e) => set("required_documents", e.target.value)} maxLength={2000} placeholder="e.g. Resume, college ID card" />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Who you would like to hire</legend>
        <p className="cp-hint">
          This is your request. The placement office decides the final list of students who receive the drive, and may add students who
          match what you need, such as strong problem solvers.
        </p>
        <div className="cp-toggles" role="group" aria-label="Graduating batch">
          {years.map((year) => (
            <label key={year} className="cp-toggle">
              <input
                type="checkbox"
                checked={form.batches.includes(year)}
                onChange={() => set("batches", form.batches.includes(year) ? form.batches.filter((b) => b !== year) : [...form.batches, year].sort())}
              />
              <span>Class of {year}</span>
            </label>
          ))}
        </div>
        <div className="cp-grid" style={{ marginTop: "1rem" }}>
          <label className="cp-wide">
            Branches or degrees
            <input value={form.branches} onChange={(e) => set("branches", e.target.value)} maxLength={1000} placeholder="e.g. CSE, ISE, ECE. Leave empty for any branch." />
          </label>
          <label>
            Minimum CGPA
            <input type="number" min={0} max={10} step={0.01} value={form.min_cgpa} onChange={(e) => set("min_cgpa", e.target.value)} />
          </label>
          <label>
            Current backlogs allowed
            <input type="number" min={0} max={100} step={1} value={form.max_backlogs} onChange={(e) => set("max_backlogs", e.target.value)} />
          </label>
          <label>
            Minimum attendance (%)
            <input type="number" min={0} max={100} step={0.1} value={form.min_attendance} onChange={(e) => set("min_attendance", e.target.value)} />
          </label>
          <label className="cp-wide">
            Anything else the placement office should know
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} rows={3} placeholder="e.g. Strong in data structures and algorithms; prior internship preferred." />
          </label>
        </div>
      </fieldset>

      {error && <p className="erp-form-error" role="alert">{error}</p>}
      {notice && !error && <p className="cp-success" role="status">{notice}</p>}
      <div className="cp-sticky-actions">
        <button type="submit" className="erp-primary" disabled={!!busy}>
          {busy === "submit" ? "Submitting…" : "Submit to the placement office"}
        </button>
        <button type="button" className="erp-secondary" disabled={!!busy} onClick={() => void run(false)}>
          {busy === "save" ? "Saving…" : "Save draft"}
        </button>
        <span className="erp-muted">Fields marked * are needed to submit.{dirty ? " Unsaved changes." : ""}</span>
      </div>
    </form>
  );
}
