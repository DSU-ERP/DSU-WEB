import Link from "next/link";
import { ArrowUpRight, Check, CircleDashed, Minus } from "lucide-react";
import {
  activityRows,
  cgpaText,
  provenanceLabel,
  rankReason,
  rankText,
  type SkillsProfile,
} from "../lib/skills";
import { Badge, PlatformStateList } from "./PlatformCards";
import { FeaturedList } from "./FeaturedProjects";
import { AiSummary } from "./AiSummary";

const READINESS_STATE = {
  met: { label: "In place", Icon: Check, tone: "good" as const },
  missing: { label: "Not yet", Icon: CircleDashed, tone: "warn" as const },
  unavailable: { label: "Unavailable", Icon: Minus, tone: "neutral" as const },
};

/**
 * Dashboard sections fed by GET /student/skills/profile: official academics,
 * technical profile, coding activity, featured projects, the AI summary and
 * the student's profile controls. Values are shown only when stored; missing
 * values say "Unavailable". There is no numeric readiness score.
 */
export function SkillsDashboard({ profile, error }: { profile: SkillsProfile | null; error?: string }) {
  if (!profile)
    return (
      <section className="st-si-dash" aria-labelledby="skills-dash-title">
        <header className="st-si-dash-head">
          <h2 id="skills-dash-title">Your placement profile</h2>
        </header>
        <p className="st-si-hidden" role="status">
          {error || "Your skills profile is unavailable right now."} The rest of your dashboard is unaffected.
        </p>
      </section>
    );
  const { academic: a, ranking: r } = profile;
  const rows = activityRows(profile);
  return (
    <section className="st-si-dash" aria-labelledby="skills-dash-title">
      <header className="st-si-dash-head">
        <div>
          <h2 id="skills-dash-title">Your placement profile</h2>
          <p>What your official record and connected platforms show. Placement officers see it according to your visibility settings.</p>
        </div>
        <Link href="/student/connections">
          Manage skills profile
          <ArrowUpRight size={14} />
        </Link>
      </header>
      <div className="st-si-dash-grid">
        <section className="st-si-block" aria-labelledby="skills-academic">
          <header>
            <h3 id="skills-academic">Academic</h3>
            <span className="st-si-provenance">{provenanceLabel("institution_verified")}</span>
          </header>
          <dl className="st-si-dl">
            <div><dt>Official CGPA</dt><dd className="st-si-num">{cgpaText(a.cgpa)}</dd></div>
            <div><dt>CGPA category</dt><dd>{a.categoryLabel || "Unclassified"}</dd></div>
            <div><dt>Category rank</dt><dd className="st-si-num">{rankText(r.categoryRank, r.categorySize, rankReason(a.cgpa))}</dd></div>
            <div><dt>Batch rank</dt><dd className="st-si-num">{rankText(r.batchRank, r.batchSize, rankReason(a.cgpa))}</dd></div>
            <div><dt>Placement eligibility</dt><dd>{a.eligible === null ? "Not determined" : a.eligible ? "Eligible" : "Not eligible"}</dd></div>
            <div><dt>Passing-out batch</dt><dd>{a.batch || "Not recorded"}</dd></div>
          </dl>
          <p className="st-si-fine">Dense rank by official CGPA within your passing-out batch. Eligibility follows the official CGPA rule (6.75 or above).</p>
        </section>

        <section className="st-si-block" aria-labelledby="skills-technical">
          <header>
            <h3 id="skills-technical">Technical profile</h3>
            <Link href="/student/connections#platforms">Edit</Link>
          </header>
          <PlatformStateList profile={profile} />
        </section>

        <section className="st-si-block" aria-labelledby="skills-activity">
          <header>
            <h3 id="skills-activity">Coding activity</h3>
          </header>
          <dl className="st-si-activity">
            {rows.map((row) => (
              <div key={row.key}>
                <dt>{row.label}</dt>
                <dd>
                  <strong className={row.value ? "st-si-num" : "st-si-unavailable"}>{row.value ?? "Unavailable"}</strong>
                  {row.value && <small className="st-si-provenance">{provenanceLabel(row.provenance)}</small>}
                  {row.note && <small>{row.note}</small>}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="st-si-block" aria-labelledby="skills-projects">
          <header>
            <h3 id="skills-projects">Featured projects</h3>
            <Link href="/student/connections#featured">Select</Link>
          </header>
          {profile.github.featured.length ? (
            <FeaturedList featured={profile.github.featured.slice(0, 3)} />
          ) : (
            <p className="st-si-hidden">
              {profile.accounts.some((x) => x.platform === "github" && x.state === "linked")
                ? "No featured projects yet. Pin repositories on GitHub or select up to three."
                : "Unavailable. Connect GitHub to feature public projects."}
            </p>
          )}
        </section>

        <section className="st-si-block st-si-wide" aria-labelledby="skills-summary">
          <header>
            <h3 id="skills-summary">AI skill summary</h3>
          </header>
          <AiSummary initial={profile.summary} shared={profile.visibility.summary} />
        </section>

        <section className="st-si-block" aria-labelledby="skills-readiness">
          <header>
            <h3 id="skills-readiness">Profile checklist</h3>
          </header>
          <ul className="st-si-readiness">
            {profile.readiness.items.map((item) => {
              const state = READINESS_STATE[item.state] || READINESS_STATE.unavailable;
              return (
                <li key={item.key}>
                  <span className={`st-si-mark st-si-mark-${state.tone}`} aria-hidden="true">
                    <state.Icon size={12} />
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <Badge tone={state.tone}>{state.label}</Badge>
                    <small>{item.detail}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="st-si-block" aria-labelledby="skills-controls">
          <header>
            <h3 id="skills-controls">Profile controls</h3>
          </header>
          <nav className="st-si-controls" aria-label="Profile controls">
            <Link href="/student/settings">Edit profile</Link>
            <Link href="/student/connections#platforms">Manage connections</Link>
            <Link href="/student/connections#platforms">Refresh data</Link>
            <Link href="/student/connections#featured">Select featured projects</Link>
            <Link href="/student/connections?preview=1#preview">Preview placement profile</Link>
            <Link href="/student/connections#visibility">Privacy and visibility</Link>
          </nav>
        </section>
      </div>
    </section>
  );
}
