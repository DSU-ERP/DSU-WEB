// Officer view of one student's skills intelligence: identity and official
// academics, technical contributions and platform intelligence, followed by
// a descriptive readiness checklist and the provenance legend. Every value
// carries where it came from; nothing is inferred or scored here.
import {
  BadgeCheck,
  Check,
  CircleSlash,
  ExternalLink,
  EyeOff,
  Minus,
  ShieldCheck,
  Sparkles,
  UserPen,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  ACTIVITY_METRICS,
  HIDDEN_METRICS,
  PROVENANCE_ORDER,
  eligibilityLabel,
  exactCgpa,
  formatDate,
  initials,
  languageShare,
  metricText,
  metricValueText,
  officerSharing,
  provenanceLabel,
  rankReason,
  rankText,
  safeHttps,
  skillStatusDetail,
  skillStatusLabel,
  type Account,
  type Metric,
  type Provenance,
  type RepoCard,
  type StudentIntelligence,
} from "@/features/placement/lib/intelligence";

const PROVENANCE_ICONS: Record<Provenance, LucideIcon> = {
  institution_verified: ShieldCheck,
  platform_verified: BadgeCheck,
  student_submitted: UserPen,
  ai_generated: Sparkles,
  unavailable: CircleSlash,
};
const DEFAULT_LEGEND: Record<Provenance, string> = {
  institution_verified: "Official record held by the university (ERP).",
  platform_verified: "Read from the platform itself through a verified connection.",
  student_submitted: "Entered by the student and not verified by the platform.",
  ai_generated: "Written by AI from the evidence listed with it. Review before relying on it.",
  unavailable: "Not available or not shared.",
};

export function ProvenanceBadge({ value }: { value: unknown }) {
  const key = (PROVENANCE_ORDER as unknown[]).includes(value) ? (value as Provenance) : "unavailable";
  const Icon = PROVENANCE_ICONS[key];
  return (
    <span className={`po-prov po-prov-${key}`}>
      <Icon size={12} aria-hidden="true" />
      {provenanceLabel(key)}
    </span>
  );
}

function Hidden({ what }: { what: string }) {
  return (
    <p className="po-intel-hidden">
      <EyeOff size={14} aria-hidden="true" /> Hidden by the student. {what}
    </p>
  );
}

/** Before consent (onboarding complete) the backend returns platform state only. */
function AwaitingConsent({ what }: { what: string }) {
  return <p className="po-intel-empty">{what} Shared after the student completes onboarding.</p>;
}

function OpenLink({ url, label }: { url: unknown; label: string }) {
  const safe = safeHttps(url);
  if (!safe) return null;
  return (
    <a className="po-open-link" href={safe} target="_blank" rel="noopener noreferrer">
      {label} <ExternalLink size={12} aria-hidden="true" />
      <span className="erp-visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

function MetricRow({ label, value, provenance }: { label: string; value: React.ReactNode; provenance: unknown }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <span>{value}</span>
        <ProvenanceBadge value={provenance} />
      </dd>
    </div>
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  github: "GitHub",
  leetcode: "LeetCode",
  hackerrank: "HackerRank",
  huggingface: "Hugging Face",
  kaggle: "Kaggle",
  linkedin: "LinkedIn",
};
const SUBMITTED_LABELS: Record<string, string> = {
  solved: "Problems solved",
  easy: "Easy problems solved",
  medium: "Medium problems solved",
  hard: "Hard problems solved",
  contestRating: "Contest rating",
  contestsAttended: "Contests attended",
};

export function IntelligenceProfile({ profile }: { profile: StudentIntelligence }) {
  return (
    <section className="po-intel" aria-labelledby="po-intel-heading">
      <div className="po-intel-head">
        <h2 id="po-intel-heading">Student profile</h2>
        <p className="erp-muted">
          Official academics from the ERP with the student&rsquo;s skills
          profile. Each value is labelled with where it comes from.
        </p>
      </div>
      <div className="po-intel-grid">
        <Identity profile={profile} />
        <Technical profile={profile} />
        <Platforms profile={profile} />
      </div>
      <div className="po-intel-foot">
        <Readiness profile={profile} />
        <Legend legend={profile.provenance} />
      </div>
    </section>
  );
}

export function IntelligenceUnavailable({ message }: { message: string }) {
  return (
    <section className="erp-panel po-intel-error" role="status">
      <h2>Skills profile</h2>
      <p>The skills profile could not be loaded. {message}</p>
      <p className="po-note">The recorded placement profile below is unaffected.</p>
    </section>
  );
}

function Identity({ profile }: { profile: StudentIntelligence }) {
  const { core, summary, skills } = profile;
  const ranking = profile.ranking ?? core.ranking;
  const text = summary?.content?.summary?.text;
  const { consented, summaryWithheld } = officerSharing(profile);
  const reason = rankReason(core.cgpa);
  const status = core.skillStatus;
  return (
    <section className="erp-panel po-intel-panel po-intel-identity" aria-labelledby="po-intel-identity">
      <div className="po-identity">
        <span className="po-avatar" aria-hidden="true">
          {initials(core.name)}
        </span>
        <div>
          <h3 id="po-intel-identity">{core.name}</h3>
          <p className="erp-muted">{core.usn}</p>
        </div>
      </div>
      <dl className="po-facts po-intel-facts">
        <MetricRow label="Department" value={core.departmentName || core.department || "Not recorded"} provenance="institution_verified" />
        {core.program && <MetricRow label="Programme" value={core.program} provenance="institution_verified" />}
        <MetricRow label="Semester" value={core.semester ?? "Not recorded"} provenance="institution_verified" />
        <MetricRow label="Passing-out batch" value={core.batch ?? "Not recorded"} provenance="institution_verified" />
        <MetricRow label="Official CGPA" value={exactCgpa(core.cgpa)} provenance={core.cgpa ? "institution_verified" : "unavailable"} />
        <MetricRow label="Category" value={core.categoryLabel || "Unclassified"} provenance={core.category ? "institution_verified" : "unavailable"} />
        <MetricRow label="Category rank" value={rankText(ranking?.categoryRank, ranking?.categorySize, reason)} provenance={ranking?.categoryRank ? "institution_verified" : "unavailable"} />
        <MetricRow label="Batch rank" value={rankText(ranking?.batchRank, ranking?.batchSize, reason)} provenance={ranking?.batchRank ? "institution_verified" : "unavailable"} />
        <MetricRow label="Placement eligibility" value={eligibilityLabel(core.eligible)} provenance={core.eligible === null ? "unavailable" : "institution_verified"} />
        <MetricRow
          label="Skills onboarding"
          value={skills.onboarding?.complete ? "Complete" : "Not complete"}
          provenance="student_submitted"
        />
        {status && (
          <MetricRow
            label="Skill profile"
            value={<span title={skillStatusDetail(status)}>{skillStatusLabel(status)}</span>}
            provenance="student_submitted"
          />
        )}
      </dl>
      <p className="po-note">
        Ranks are dense ranks by official CGPA within passing-out batch{" "}
        {core.batch ?? "not recorded"}; students with equal CGPA share a rank.
        The category rank counts only students in the same category.
      </p>
      <div className="po-summary">
        <div className="po-summary-head">
          <h4>Profile summary</h4>
          {summary && <ProvenanceBadge value="ai_generated" />}
        </div>
        {!consented ? (
          <AwaitingConsent what="The AI summary is not available yet." />
        ) : summaryWithheld ? (
          <p className="po-intel-hidden">
            <EyeOff size={14} aria-hidden="true" /> Summary withheld because it used information the student has since hidden.
          </p>
        ) : summary && text ? (
          <>
            <p>{text}</p>
            <p className="po-note">
              Generated {formatDate(summary.createdAt)} from the evidence on
              this profile.{" "}
              {summary.reviewedAt
                ? `Reviewed by the student on ${formatDate(summary.reviewedAt)}.`
                : "Not yet reviewed by the student."}
            </p>
          </>
        ) : !skills.visibility?.summary ? (
          <Hidden what="The AI summary is not shared." />
        ) : (
          <p className="po-intel-empty">No AI summary has been generated yet.</p>
        )}
      </div>
    </section>
  );
}

/**
 * What can be said about one platform. Accounts the student hid are omitted by
 * the backend, so a missing account reads "Not provided or not shared".
 * Before consent a linked account carries no details ("pending").
 */
function accountState(account: Account | undefined, platformsVisible: boolean, consented: boolean) {
  if (!account) return "missing" as const;
  if (account.state === "declared_none") return "none" as const;
  if (account.state !== "linked") return "missing" as const;
  if (!consented && !account.handle) return "pending" as const;
  if (!platformsVisible && !account.handle) return "hidden" as const;
  return "linked" as const;
}

function StateNote({ state, platform }: { state: ReturnType<typeof accountState>; platform: string }) {
  if (state === "none") return <p className="po-intel-empty">Does not use this platform.</p>;
  if (state === "pending") return <AwaitingConsent what={`Linked. ${platform} details are not available yet.`} />;
  if (state === "hidden") return <Hidden what={`${platform} details are not shared.`} />;
  if (state === "missing") return <p className="po-intel-empty">Not provided or not shared.</p>;
  return null;
}

function Technical({ profile }: { profile: StudentIntelligence }) {
  const { skills } = profile;
  const vis = skills.visibility ?? { platforms: true, projects: true, activity: true, summary: true };
  const { consented } = officerSharing(profile);
  const github = skills.accounts.find((a) => a.platform === "github");
  const state = accountState(github, vis.platforms, consented);
  // Projects and activity need a linked GitHub account the student has not
  // hidden (hidden accounts are omitted), whatever the platforms switch says.
  const githubShared = github?.state === "linked";
  const metric = (key: string): Metric | undefined =>
    github?.metrics.find((m) => m.metric === key) ?? skills.activity.find((m) => m.metric === key);
  const repos = metric("repos.public");
  const otherMetrics = (github?.metrics ?? []).filter(
    (m) => m.metric !== "repos.public" && m.metric !== "languages.top" && !HIDDEN_METRICS.has(m.metric),
  );
  const extraActivity = skills.activity.filter(
    (m) => !HIDDEN_METRICS.has(m.metric) && !ACTIVITY_METRICS.some((a) => a.metric === m.metric),
  );
  const featured = skills.featured.slice(0, 3);
  const featuredNames = new Set(featured.map((f) => f.repo.fullName || f.repo.name));
  const others = skills.repositories.filter((r) => !featuredNames.has(r.fullName || r.name));
  const seen = new Map<string, RepoCard>();
  for (const r of [...featured.map((f) => f.repo), ...skills.repositories]) seen.set(r.fullName || r.name, r);
  const share = languageShare([...seen.values()]);
  return (
    <section className="erp-panel po-intel-panel" aria-labelledby="po-intel-tech">
      <h3 id="po-intel-tech">Technical contributions</h3>
      <div className="po-platform-head">
        <h4>GitHub</h4>
        {state === "linked" && github?.ownership && <ProvenanceBadge value={github.ownership} />}
      </div>
      {state === "linked" && github ? (
        <p className="po-handle">
          <span>{github.handle}</span>
          <OpenLink url={github.profileUrl} label="Open profile" />
        </p>
      ) : (
        <StateNote state={state} platform="GitHub" />
      )}
      <h4>Verified coding activity</h4>
      {consented && <dl className="po-facts po-intel-facts">
        <MetricRow
          label="Public repositories"
          value={repos ? metricText(repos.value) : "Unavailable"}
          provenance={repos ? repos.verification : "unavailable"}
        />
        {otherMetrics.map((m) => (
          <MetricRow key={m.metric} label={m.label || m.metric} value={metricValueText(m)} provenance={m.verification} />
        ))}
        {consented && vis.activity && githubShared &&
          ACTIVITY_METRICS.map((a) => {
            const m = metric(a.metric);
            return (
              <MetricRow
                key={a.metric}
                label={m?.label || a.label}
                value={m ? metricValueText(m) : "Unavailable"}
                provenance={m ? m.verification : "unavailable"}
              />
            );
          })}
        {consented && vis.activity && githubShared &&
          extraActivity.map((m) => (
            <MetricRow key={m.metric} label={m.label || m.metric} value={metricValueText(m)} provenance={m.verification} />
          ))}
      </dl>}
      {!consented ? (
        <AwaitingConsent what="Contribution activity is not available yet." />
      ) : !vis.activity ? (
        <Hidden what="Contribution activity is not shared." />
      ) : !githubShared ? (
        <p className="po-intel-empty">Contribution activity needs a linked GitHub account that is shared.</p>
      ) : null}

      <h4>Featured projects</h4>
      {!consented ? (
        <AwaitingConsent what="Projects are not available yet." />
      ) : !vis.projects ? (
        <Hidden what="Projects are not shared." />
      ) : featured.length ? (
        <ol className="po-projects">
          {featured.map((f) => {
            const url = safeHttps(f.repo.url);
            return (
              <li key={f.repo.fullName || f.repo.name}>
                <div className="po-project-head">
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {f.repo.name} <ExternalLink size={12} aria-hidden="true" />
                      <span className="erp-visually-hidden"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <strong>{f.repo.name}</strong>
                  )}
                  <span className="po-source">
                    {f.source === "github_pinned" ? "Pinned on GitHub" : "Selected by student"}
                  </span>
                </div>
                {f.repo.description && <p>{f.repo.description}</p>}
                <p className="po-project-meta">
                  {f.repo.primaryLanguage || "Language not detected"} ·{" "}
                  {f.repo.stars ?? 0} {f.repo.stars === 1 ? "star" : "stars"}
                  {f.repo.pushedAt ? ` · Updated ${formatDate(f.repo.pushedAt)}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      ) : !githubShared ? (
        <p className="po-intel-empty">Projects need a linked GitHub account that is shared.</p>
      ) : (
        <p className="po-intel-empty">No featured projects yet.</p>
      )}
      {consented && vis.projects && others.length > 0 && (
        <>
          <h4>Other public repositories</h4>
          <ul className="po-repos">
            {others.map((r) => {
              const url = safeHttps(r.url);
              return (
                <li key={r.fullName || r.name}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {r.name}
                      <span className="erp-visually-hidden"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span>{r.name}</span>
                  )}
                  <small>{r.primaryLanguage || "Language not detected"}</small>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {consented && vis.projects && share.length > 0 && (
        <>
          <h4>Technologies</h4>
          <p className="po-note">
            Repository language share: the primary language of the{" "}
            {share[0].total} {share[0].total === 1 ? "repository" : "repositories"} shown here.
            It describes the repositories, not a skill level.
          </p>
          <ul className="po-langs">
            {share.map((l) => (
              <li key={l.language}>
                <span>{l.language}</span>
                <span className="po-lang-bar" aria-hidden="true">
                  <i style={{ width: `${l.percent}%` }} />
                </span>
                <small>
                  {l.percent.toFixed(1)}% ({l.count})
                </small>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Submitted({ platform, submitted }: { platform: string; submitted: Record<string, unknown> }) {
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (platform === "leetcode")
    for (const [key, label] of Object.entries(SUBMITTED_LABELS))
      if (submitted[key] !== undefined && submitted[key] !== null) rows.push({ label, value: metricText(submitted[key]) });
  if (platform === "hackerrank") {
    const badges = Array.isArray(submitted.badges) ? (submitted.badges as { name?: string; stars?: number }[]) : [];
    if (badges.length)
      rows.push({
        label: "Badges",
        value: badges.map((b) => `${b.name ?? "Badge"} (${b.stars ?? 0} ${b.stars === 1 ? "star" : "stars"})`).join(", "),
      });
    const certs = Array.isArray(submitted.certifications)
      ? (submitted.certifications as { name?: string; url?: string }[])
      : [];
    if (certs.length)
      rows.push({
        label: "Certifications",
        value: (
          <span className="po-cert-list">
            {certs.map((c, i) => {
              const url = safeHttps(c.url);
              return url ? (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  {c.name ?? "Certificate"}
                  <span className="erp-visually-hidden"> (opens in a new tab)</span>
                </a>
              ) : (
                <span key={i}>{c.name ?? "Certificate"}</span>
              );
            })}
          </span>
        ),
      });
  }
  if (platform === "kaggle") {
    const items = Array.isArray(submitted.achievements) ? (submitted.achievements as { title?: string }[]) : [];
    if (items.length) rows.push({ label: "Achievements", value: items.map((a) => a.title).filter(Boolean).join(", ") });
  }
  if (!rows.length) return null;
  return (
    <>
      {rows.map((r) => (
        <MetricRow key={r.label} label={r.label} value={r.value} provenance="student_submitted" />
      ))}
    </>
  );
}

function Platforms({ profile }: { profile: StudentIntelligence }) {
  const { skills } = profile;
  const visible = skills.visibility?.platforms !== false;
  const { consented } = officerSharing(profile);
  return (
    <section className="erp-panel po-intel-panel" aria-labelledby="po-intel-platforms">
      <h3 id="po-intel-platforms">Platform intelligence</h3>
      {!consented ? (
        <AwaitingConsent what="Handles and figures are not available yet; only whether each platform is linked." />
      ) : (
        !visible && <Hidden what="Platform handles and figures are not shared." />
      )}
      <div className="po-platforms">
        {["leetcode", "hackerrank", "huggingface", "kaggle", "linkedin"].map((platform) => {
          const account = skills.accounts.find((a) => a.platform === platform);
          const state = accountState(account, visible, consented);
          const name = PLATFORM_LABELS[platform];
          const submitted = account?.submitted && typeof account.submitted === "object" ? account.submitted : {};
          const figures = state === "linked" && account ? <Submitted platform={platform} submitted={submitted} /> : null;
          return (
            <article key={platform} className="po-platform" aria-label={name}>
              <div className="po-platform-head">
                <h4>{name}</h4>
                {state === "linked" && account?.ownership && <ProvenanceBadge value={account.ownership} />}
              </div>
              {state === "linked" && account ? (
                <>
                  <p className="po-handle">
                    <span>{account.handle || "Handle not given"}</span>
                    <OpenLink url={account.profileUrl} label="Open profile" />
                  </p>
                  {account.ownership === "student_submitted" && (
                    <p className="po-note po-submitted-note">
                      Student submitted: the link and any figures are entered by
                      the student and not verified by {name}.
                    </p>
                  )}
                  {account.metrics.length > 0 || figures ? (
                    <dl className="po-facts po-intel-facts">
                      {account.metrics
                        .filter((m) => !HIDDEN_METRICS.has(m.metric))
                        .map((m) => (
                          <MetricRow key={m.metric} label={m.label || m.metric} value={metricValueText(m)} provenance={m.verification} />
                        ))}
                      {figures}
                    </dl>
                  ) : (
                    <p className="po-intel-empty">No figures provided.</p>
                  )}
                  {account.syncStatus === "failed" && (
                    <p className="po-note">The last sync failed. Earlier figures are kept.</p>
                  )}
                  {account.lastSyncedAt && <p className="po-note">Synced {formatDate(account.lastSyncedAt)}.</p>}
                </>
              ) : (
                <StateNote state={state} platform={name} />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

const STATE: Record<string, { label: string; Icon: LucideIcon }> = {
  met: { label: "Met", Icon: Check },
  missing: { label: "Missing", Icon: X },
  unavailable: { label: "Unavailable", Icon: Minus },
};

function Readiness({ profile }: { profile: StudentIntelligence }) {
  const items = profile.readiness?.items ?? [];
  return (
    <section className="erp-panel po-intel-panel" aria-labelledby="po-intel-readiness">
      <h3 id="po-intel-readiness">Placement readiness</h3>
      <p className="po-note">
        A descriptive checklist from recorded evidence. It is not a score, and
        a missing platform says nothing about ability.
      </p>
      {items.length ? (
        <ul className="po-readiness">
          {items.map((item) => {
            const s = STATE[item.state] ?? STATE.unavailable;
            return (
              <li key={item.key} className={`po-ready-${item.state}`}>
                <span className="po-ready-state">
                  <s.Icon size={14} aria-hidden="true" />
                  {s.label}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                  <ProvenanceBadge value={item.provenance} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="po-intel-empty">No readiness information is available.</p>
      )}
    </section>
  );
}

function Legend({ legend }: { legend: Partial<Record<Provenance, string>> }) {
  return (
    <section className="erp-panel po-intel-panel" aria-labelledby="po-intel-legend">
      <h3 id="po-intel-legend">Where values come from</h3>
      <dl className="po-prov-legend">
        {PROVENANCE_ORDER.map((key) => (
          <div key={key}>
            <dt>
              <ProvenanceBadge value={key} />
            </dt>
            <dd>{legend?.[key] || DEFAULT_LEGEND[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
