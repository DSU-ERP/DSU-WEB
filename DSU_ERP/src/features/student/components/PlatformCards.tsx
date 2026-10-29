"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BrainCircuit,
  CircleHelp,
  BriefcaseBusiness,
  ChartColumn,
  CodeXml,
  ExternalLink,
  FolderGit2,
  KeyRound,
  Minus,
  Plus,
  RefreshCw,
  SquareTerminal,
} from "lucide-react";
import { safeHttps } from "@/shared/http/safe-url";
import {
  HANDLE_HINTS,
  LEETCODE_FIELDS,
  OPTIONAL_PLATFORMS,
  PLATFORMS,
  PLATFORM_LABELS,
  REQUIRED_PLATFORMS,
  SUPPORTS_FIGURES,
  accountStatus,
  authMethodLabel,
  checkFigures,
  checkToken,
  dateText,
  invalidFieldText,
  metricName,
  metricText,
  normalizeHandle,
  provenanceLabel,
  safeGitHubUrl,
  submittedSummary,
  waitText,
  type LeetCodeFigures,
  type Platform,
  type PlatformAccount,
  type SkillsProfile,
  type StateBadge,
} from "../lib/skills";
import { errorCode, errorDetails, errorText, skillsApi, type useSkillsProfile } from "../lib/skills-client";

type Skills = ReturnType<typeof useSkillsProfile>;
type Mode = "onboarding" | "manage";

const ICONS: Record<Platform, typeof CodeXml> = {
  github: FolderGit2,
  leetcode: CodeXml,
  hackerrank: SquareTerminal,
  linkedin: BriefcaseBusiness,
  huggingface: BrainCircuit,
  kaggle: ChartColumn,
};
const DESCRIPTIONS: Record<Platform, string> = {
  github: "Public repositories, languages and contribution activity, read through a verified connection. Private repositories are never accessed.",
  leetcode: "Your profile link. You can also add the problem counts and contest figures shown on your profile.",
  hackerrank: "Your profile link. You can also list the badges and certificates shown on your profile.",
  linkedin: "A link to your public LinkedIn profile.",
  huggingface: "Public model, dataset and Space counts, read from the Hugging Face Hub for the username you enter.",
  kaggle: "Your profile link. You can also list achievements shown on your profile.",
};

export function Badge({ tone = "neutral", children, title }: { tone?: StateBadge["tone"]; children: ReactNode; title?: string }) {
  return <span className={`st-si-badge st-si-badge-${tone}`} title={title}>{children}</span>;
}

/** LeetCode name check: a plausibility check against the official name, not proof of ownership. */
export function NameMatchBadge({ value }: { value: PlatformAccount["nameMatch"] }) {
  if (!value) return null;
  return value === "verified" ? (
    <Badge tone="good" title="Your LeetCode username or LeetCode profile name matches your name in the university record.">
      <BadgeCheck size={11} aria-hidden="true" /> Verified
    </Badge>
  ) : (
    <Badge tone="warn" title="Your LeetCode username and profile name do not match your name in the university record. Add your name to your LeetCode profile; it is checked again at the next sync.">
      <CircleHelp size={11} aria-hidden="true" /> Unverified
    </Badge>
  );
}

/** Six platform cards: GitHub first, then the link-based platforms. */
export function PlatformCards({ skills, mode }: { skills: Skills; mode: Mode }) {
  const byPlatform = new Map(skills.profile.accounts.map((a) => [a.platform, a]));
  return (
    <div className="st-si-cards">
      {PLATFORMS.map((platform) =>
        platform === "github" ? (
          <GitHubCard key={platform} skills={skills} mode={mode} account={byPlatform.get("github")} />
        ) : (
          <LinkCard key={platform} platform={platform} skills={skills} mode={mode} account={byPlatform.get(platform)} />
        ),
      )}
    </div>
  );
}

function CardFrame({
  platform,
  account,
  children,
}: {
  platform: Platform;
  account?: PlatformAccount;
  children: ReactNode;
}) {
  const Icon = ICONS[platform];
  const status = accountStatus(account);
  const titleId = useId();
  return (
    <article className="st-si-card" aria-labelledby={titleId} data-platform={platform} data-state={account?.state ?? "missing"}>
      <header className="st-si-card-head">
        <span className="st-si-card-icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.6} />
        </span>
        <div>
          <h3 id={titleId}>{PLATFORM_LABELS[platform]}</h3>
          <p>{OPTIONAL_PLATFORMS.includes(platform) ? "Optional" : "Required"}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </header>
      <p className="st-si-card-text">{DESCRIPTIONS[platform]}</p>
      {status.detail && <p className={`st-si-note${status.tone === "bad" ? " st-si-note-bad" : ""}`}>{status.detail}</p>}
      {children}
    </article>
  );
}

function LinkedFacts({ account }: { account: PlatformAccount }) {
  const profileUrl = safeHttps(account.profileUrl);
  const figures = submittedSummary(account.platform, account.submitted);
  const metrics = account.metrics.map((m) => ({ m, text: metricText(m) })).filter((x) => x.text && !/\.top$/.test(x.m.metric));
  return (
    <dl className="st-si-facts">
      <div>
        <dt>Profile</dt>
        <dd>
          {profileUrl ? (
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              {account.handle}
              <ExternalLink size={12} aria-hidden="true" />
              <span className="st-visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : (
            account.handle
          )}
          {account.platform === "leetcode" && <span className="st-si-namematch"><NameMatchBadge value={account.nameMatch} /></span>}
        </dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd>
          {authMethodLabel(account)}
          <span className="st-si-provenance">{provenanceLabel(account.ownership)}</span>
        </dd>
      </div>
      {figures.length > 0 && (
        <div>
          <dt>Figures you entered</dt>
          <dd>
            {figures.join(". ")}
            <span className="st-si-provenance">Student submitted, not verified by DSU</span>
          </dd>
        </div>
      )}
      {metrics.length > 0 && (
        <div>
          <dt>From the platform</dt>
          <dd>
            {metrics.map(({ m, text }) => `${metricName(m)}: ${text}`).join(". ")}
            <span className="st-si-provenance">{provenanceLabel(metrics[0].m.verification)}</span>
          </dd>
        </div>
      )}
      {(account.syncStatus && account.syncStatus !== "not_applicable") && (
        <div>
          <dt>Last synced</dt>
          <dd>{dateText(account.lastSyncedAt, true)}</dd>
        </div>
      )}
    </dl>
  );
}

/** Refresh, officer visibility and disconnect, shared by every linked card. */
function LinkedActions({
  account,
  skills,
  mode,
  onEdit,
  setError,
  canDisconnect = !REQUIRED_PLATFORMS.includes(account.platform),
}: {
  account: PlatformAccount;
  skills: Skills;
  mode: Mode;
  onEdit?: () => void;
  setError: (message: string) => void;
  canDisconnect?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [info, setInfo] = useState("");
  const name = PLATFORM_LABELS[account.platform];
  const syncable = ["github_app", "github_pat", "public_api"].includes(account.authMethod ?? "");
  const busy = skills.busy !== null;
  const run = async (key: string, work: () => Promise<unknown>, done?: string) => {
    setError("");
    setInfo("");
    const result = await skills.act(key, work);
    if (result.ok) {
      if (done) setInfo(done);
      return true;
    }
    const code = errorCode(result.error);
    setError(
      code === "REFRESH_LIMIT"
        ? `You can refresh ${name} once every 10 minutes. Try again ${waitText(errorDetails(result.error).retryAfterSeconds)}.`
        : errorText(result.error),
    );
    return false;
  };
  return (
    <>
      {mode === "manage" && (
        <label className="st-si-switch">
          <input
            type="checkbox"
            checked={account.visible}
            disabled={busy}
            onChange={(e) => void run(`${account.platform}-visible`, () => skillsApi.accountVisibility(account.platform, e.target.checked))}
          />
          <span>Show this platform to placement officers</span>
        </label>
      )}
      {confirm ? (
        <div className="st-si-confirm" role="group" aria-label={`Disconnect ${name}`}>
          <p>
            Disconnect {name}?{" "}
            {account.platform === "github"
              ? "The stored access is deleted and synced repositories and activity are removed."
              : "The link and any figures you entered are removed."}
          </p>
          <div className="st-actions">
            <button
              className="st-button st-button-danger"
              disabled={busy}
              onClick={async () => {
                if (await run(`${account.platform}-disconnect`, () => skillsApi.disconnect(account.platform))) setConfirm(false);
              }}
            >
              Disconnect {name}
            </button>
            <button className="st-button st-button-secondary" disabled={busy} onClick={() => setConfirm(false)}>
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <div className="st-actions st-si-card-actions">
          {mode === "manage" && syncable && (
            <button
              className="st-button st-button-secondary"
              disabled={busy}
              onClick={() => void run(`${account.platform}-refresh`, () => skillsApi.refresh(account.platform), "Refresh requested. New data appears after the background sync finishes.")}
            >
              <RefreshCw size={14} aria-hidden="true" />
              {skills.busy === `${account.platform}-refresh` ? "Requesting" : "Refresh data"}
            </button>
          )}
          {onEdit && (
            <button className="st-button st-button-secondary" disabled={busy} onClick={onEdit}>
              Edit
            </button>
          )}
          {canDisconnect && (
            <button className="st-button st-button-secondary" disabled={busy} onClick={() => setConfirm(true)}>
              Disconnect
            </button>
          )}
        </div>
      )}
      {info && (
        <p className="st-success" role="status">
          {info}
        </p>
      )}
    </>
  );
}

function ErrorLine({ message }: { message: string }) {
  return message ? (
    <p className="st-error" role="alert">
      {message}
    </p>
  ) : null;
}

// ---- GitHub ---------------------------------------------------------------------
function GitHubCard({ skills, mode, account }: { skills: Skills; mode: Mode; account?: PlatformAccount }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tokenOpen, setTokenOpen] = useState(false);
  // What the server told us about GitHub on this deployment.
  const [appUnavailable, setAppUnavailable] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const linked = account?.state === "linked";
  const reconnect = linked && account?.syncError === "CREDENTIAL_INVALID";
  const busy = skills.busy !== null;
  const notConfigured = (code?: string) => {
    if (code === "INTEGRATIONS_NOT_CONFIGURED") {
      setUnavailable(true);
      setTokenOpen(false);
      setNotice("");
      return true;
    }
    if (code === "GITHUB_APP_NOT_CONFIGURED") {
      setAppUnavailable(true);
      setTokenOpen(true);
      setNotice("Connecting through GitHub is not set up on this server yet. You can connect with a fine-grained token instead.");
      return true;
    }
    return false;
  };
  const connect = async () => {
    setError("");
    const result = await skills.act("github-authorize", () => skillsApi.authorizeGitHub(), { reload: false });
    if (result.ok) {
      const url = safeGitHubUrl(result.value.url);
      if (url) window.location.assign(url);
      else setError("GitHub could not be opened. Please try again.");
      return;
    }
    if (!notConfigured(errorCode(result.error))) setError(errorText(result.error));
  };
  const options = (
    <>
      {unavailable ? (
        <p className="st-si-note st-si-note-warn" role="status">
          GitHub connection is not available on this server yet. GitHub is required before skills-profile setup can finish.
        </p>
      ) : (
        notice && (
          <p className="st-si-note st-si-note-warn" role="status">
            {notice}
          </p>
        )
      )}
      <div className="st-actions st-si-card-actions">
        {!appUnavailable && !unavailable && (
          <button className="st-button" disabled={busy} onClick={() => void connect()}>
            <FolderGit2 size={15} aria-hidden="true" />
            {skills.busy === "github-authorize" ? "Opening GitHub" : reconnect ? "Reconnect with GitHub" : "Connect with GitHub"}
          </button>
        )}
        {!unavailable && (
          <button
            className="st-button st-button-secondary"
            aria-expanded={tokenOpen}
            aria-controls="github-token-form"
            disabled={busy}
            onClick={() => setTokenOpen(!tokenOpen)}
          >
            <KeyRound size={14} aria-hidden="true" />
            Use a fine-grained token
          </button>
        )}
      </div>
      {tokenOpen && !unavailable && <TokenForm skills={skills} onUnavailable={notConfigured} />}
    </>
  );
  return (
    <CardFrame platform="github" account={account}>
      {linked && account && <LinkedFacts account={account} />}
      {linked && account ? (
        <>
          {reconnect && options}
          <LinkedActions account={account} skills={skills} mode={mode} setError={setError} />
        </>
      ) : (
        options
      )}
      <ErrorLine message={error} />
    </CardFrame>
  );
}

function TokenForm({ skills, onUnavailable }: { skills: Skills; onUnavailable: (code?: string) => boolean }) {
  // The token lives only in this input until it is sent, and is cleared after
  // every attempt so it is never displayed again.
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const id = useId();
  const busy = skills.busy !== null;
  return (
    <form
      id="github-token-form"
      className="st-si-token"
      autoComplete="off"
      onSubmit={async (e) => {
        e.preventDefault();
        const problem = checkToken(token);
        if (problem) {
          setError(problem);
          return;
        }
        setError("");
        const value = token.trim();
        setToken("");
        const result = await skills.act("github-token", () => skillsApi.githubToken(value));
        if (!result.ok && !onUnavailable(errorCode(result.error))) setError(errorText(result.error));
      }}
    >
      <p className="st-si-token-title">Create a read-only fine-grained token</p>
      <ol>
        <li>
          On GitHub, open Settings, Developer settings, Fine-grained tokens, then{" "}
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">
            Generate new token
            <span className="st-visually-hidden"> (opens in a new tab)</span>
          </a>
          .
        </li>
        <li>Resource owner: your personal account. Choose an expiry date.</li>
        <li>Repository access: Public repositories (read-only).</li>
        <li>Permissions: leave every permission at No access. Public data needs no write access and no private repositories.</li>
      </ol>
      <p className="st-si-fine">The token is encrypted on the DSU server, used only to read public data, and never shown again. You can disconnect at any time.</p>
      <label htmlFor={id}>Fine-grained token</label>
      <div className="st-si-inline">
        <input
          id={id}
          className="st-input"
          type="password"
          name="github-fine-grained-token"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          placeholder="github_pat_"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          aria-invalid={!!error}
        />
        <button className="st-button" disabled={busy}>
          {skills.busy === "github-token" ? "Checking" : "Connect with token"}
        </button>
      </div>
      <ErrorLine message={error} />
    </form>
  );
}

// ---- Link-based platforms ------------------------------------------------------
type FigureForm = {
  leetcode: Partial<Record<keyof LeetCodeFigures, string>>;
  badges: { name: string; stars: string }[];
  certifications: { name: string; url: string }[];
  achievements: { title: string }[];
};
function figureForm(account?: PlatformAccount): FigureForm {
  const s = account?.state === "linked" ? account.submitted : {};
  return {
    leetcode: Object.fromEntries(LEETCODE_FIELDS.map((f) => [f.key, typeof s[f.key] === "number" ? String(s[f.key]) : ""])),
    badges: Array.isArray(s.badges) ? s.badges.map((b) => ({ name: b.name, stars: String(b.stars) })) : [],
    certifications: Array.isArray(s.certifications) ? s.certifications.map((c) => ({ name: c.name, url: c.url })) : [],
    achievements: Array.isArray(s.achievements) ? s.achievements.map((a) => ({ title: a.title })) : [],
  };
}

function LinkCard({ platform, skills, mode, account }: { platform: Exclude<Platform, "github">; skills: Skills; mode: Mode; account?: PlatformAccount }) {
  const linked = account?.state === "linked";
  const [editing, setEditing] = useState(!linked);
  const [error, setError] = useState("");
  const name = PLATFORM_LABELS[platform];
  const busy = skills.busy !== null;
  useEffect(() => {
    // After a disconnect or a server change, show the form again.
    if (!linked) setEditing(true);
  }, [linked]);
  const declare = async () => {
    setError("");
    const result = await skills.act(`${platform}-none`, () => skillsApi.declareNone(platform));
    if (!result.ok) setError(errorText(result.error));
  };
  return (
    <CardFrame platform={platform} account={account}>
      {linked && account && !editing && (
        <>
          <LinkedFacts account={account} />
          <LinkedActions account={account} skills={skills} mode={mode} onEdit={() => setEditing(true)} setError={setError} />
        </>
      )}
      {(!linked || editing) && (
        <LinkForm
          platform={platform}
          account={account}
          skills={skills}
          onSaved={() => setEditing(false)}
          onCancel={linked ? () => setEditing(false) : undefined}
        />
      )}
      {!REQUIRED_PLATFORMS.includes(platform) && !linked && account?.state !== "declared_none" && (
        <div className="st-actions st-si-card-actions">
          <button className="st-button st-button-secondary" disabled={busy} onClick={() => void declare()}>
            I don&rsquo;t use {name}
          </button>
        </div>
      )}
      <ErrorLine message={error} />
    </CardFrame>
  );
}

function LinkForm({
  platform,
  account,
  skills,
  onSaved,
  onCancel,
}: {
  platform: Exclude<Platform, "github">;
  account?: PlatformAccount;
  skills: Skills;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(account?.state === "linked" ? account.profileUrl ?? account.handle ?? "" : "");
  const [figures, setFigures] = useState<FigureForm>(() => figureForm(account));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const id = useId();
  const name = PLATFORM_LABELS[platform];
  const busy = skills.busy !== null;
  const hasFigures = SUPPORTS_FIGURES.includes(platform);
  const startOpen = hasFigures && submittedSummary(platform, account?.state === "linked" ? account.submitted : {}).length > 0;
  return (
    <form
      className="st-si-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (!normalizeHandle(platform, value)) {
          setFieldErrors({});
          setError(`Enter a valid ${name} username or profile link. ${HANDLE_HINTS[platform]}.`);
          return;
        }
        const checked = checkFigures(platform, figures);
        if (!checked.ok) {
          setFieldErrors(checked.errors);
          setError("Check the highlighted figures.");
          return;
        }
        setFieldErrors({});
        const result = await skills.act(`${platform}-link`, () => skillsApi.link(platform, value.trim(), checked.data));
        if (result.ok) {
          onSaved();
          return;
        }
        const code = errorCode(result.error);
        setError(
          code === "INVALID_SUBMITTED_FIELDS"
            ? `${errorText(result.error)} ${invalidFieldText(errorDetails(result.error).fields) ? "Fields: " + invalidFieldText(errorDetails(result.error).fields) + "." : ""}`.trim()
            : errorText(result.error),
        );
      }}
    >
      <label htmlFor={id}>{platform === "linkedin" ? "LinkedIn profile link" : `${name} profile link or username`}</label>
      <input
        id={id}
        className="st-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={platform === "linkedin" ? "https://www.linkedin.com/in/your-name" : "Profile link or username"}
        autoComplete="off"
        spellCheck={false}
        aria-describedby={`${id}-hint`}
      />
      <small id={`${id}-hint`} className="st-si-fine">
        {HANDLE_HINTS[platform]}
      </small>
      {hasFigures && (
        <details className="st-si-figures" open={startOpen}>
          <summary>Add figures from your profile (optional)</summary>
          <p className="st-si-fine">Student submitted, not verified by DSU. Enter only what your public profile shows.</p>
          {platform === "leetcode" && (
            <div className="st-si-figure-grid">
              {LEETCODE_FIELDS.map((field) => (
                <div key={field.key} className="st-si-figure">
                  <label>
                    {field.label}
                    <input
                      className="st-input"
                      inputMode={field.integer ? "numeric" : "decimal"}
                      value={figures.leetcode[field.key] ?? ""}
                      aria-invalid={!!fieldErrors[field.key]}
                      aria-describedby={fieldErrors[field.key] ? `${id}-${field.key}-error` : undefined}
                      onChange={(e) => setFigures({ ...figures, leetcode: { ...figures.leetcode, [field.key]: e.target.value } })}
                    />
                  </label>
                  {fieldErrors[field.key] && (
                    <small id={`${id}-${field.key}-error`} className="st-si-field-error">
                      {fieldErrors[field.key]}
                    </small>
                  )}
                </div>
              ))}
            </div>
          )}
          {platform === "hackerrank" && (
            <>
              <Rows
                legend="Badges"
                rows={figures.badges}
                max={20}
                empty={{ name: "", stars: "" }}
                onChange={(badges) => setFigures({ ...figures, badges })}
                render={(row, i, set) => (
                  <>
                    <label>
                      Badge name
                      <input className="st-input" value={row.name} aria-invalid={!!fieldErrors[`badges.${i}.name`]} onChange={(e) => set({ ...row, name: e.target.value })} />
                    </label>
                    <label className="st-si-narrow">
                      Stars (0 to 6)
                      <input className="st-input" inputMode="numeric" value={row.stars} aria-invalid={!!fieldErrors[`badges.${i}.stars`]} onChange={(e) => set({ ...row, stars: e.target.value })} />
                    </label>
                    {(fieldErrors[`badges.${i}.name`] || fieldErrors[`badges.${i}.stars`]) && (
                      <small className="st-si-field-error">{fieldErrors[`badges.${i}.name`] || fieldErrors[`badges.${i}.stars`]}</small>
                    )}
                  </>
                )}
              />
              <Rows
                legend="Certificates"
                rows={figures.certifications}
                max={20}
                empty={{ name: "", url: "" }}
                onChange={(certifications) => setFigures({ ...figures, certifications })}
                render={(row, i, set) => (
                  <>
                    <label>
                      Certificate name
                      <input className="st-input" value={row.name} aria-invalid={!!fieldErrors[`certifications.${i}.name`]} onChange={(e) => set({ ...row, name: e.target.value })} />
                    </label>
                    <label>
                      Certificate link
                      <input
                        className="st-input"
                        value={row.url}
                        placeholder="https://www.hackerrank.com/certificates/..."
                        aria-invalid={!!fieldErrors[`certifications.${i}.url`]}
                        onChange={(e) => set({ ...row, url: e.target.value })}
                      />
                    </label>
                    {(fieldErrors[`certifications.${i}.name`] || fieldErrors[`certifications.${i}.url`]) && (
                      <small className="st-si-field-error">{fieldErrors[`certifications.${i}.name`] || fieldErrors[`certifications.${i}.url`]}</small>
                    )}
                  </>
                )}
              />
            </>
          )}
          {platform === "kaggle" && (
            <Rows
              legend="Achievements"
              rows={figures.achievements}
              max={10}
              empty={{ title: "" }}
              onChange={(achievements) => setFigures({ ...figures, achievements })}
              render={(row, i, set) => (
                <>
                  <label>
                    Achievement
                    <input className="st-input" value={row.title} aria-invalid={!!fieldErrors[`achievements.${i}.title`]} onChange={(e) => set({ title: e.target.value })} />
                  </label>
                  {fieldErrors[`achievements.${i}.title`] && <small className="st-si-field-error">{fieldErrors[`achievements.${i}.title`]}</small>}
                </>
              )}
            />
          )}
        </details>
      )}
      <ErrorLine message={error} />
      <div className="st-actions st-si-card-actions">
        <button className="st-button" disabled={busy}>
          {skills.busy === `${platform}-link` ? "Saving" : `Save ${name}`}
        </button>
        {onCancel && (
          <button type="button" className="st-button st-button-secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Rows<T>({
  legend,
  rows,
  max,
  empty,
  onChange,
  render,
}: {
  legend: string;
  rows: T[];
  max: number;
  empty: T;
  onChange: (rows: T[]) => void;
  render: (row: T, index: number, set: (row: T) => void) => ReactNode;
}) {
  return (
    <fieldset className="st-si-rows">
      <legend>{legend}</legend>
      {rows.map((row, i) => (
        <div className="st-si-row" key={i}>
          {render(row, i, (next) => onChange(rows.map((r, j) => (j === i ? next : r))))}
          <button type="button" className="st-icon-button st-si-remove" aria-label={`Remove ${legend.toLowerCase()} ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            <Minus size={14} />
          </button>
        </div>
      ))}
      {rows.length < max && (
        <button type="button" className="st-si-add" onClick={() => onChange([...rows, { ...empty }])}>
          <Plus size={14} aria-hidden="true" />
          Add {legend.toLowerCase().replace(/s$/, "")}
        </button>
      )}
    </fieldset>
  );
}

/** Platform states as a compact list (review step and dashboard). */
export function PlatformStateList({ profile }: { profile: SkillsProfile }) {
  const byPlatform = new Map(profile.accounts.map((a) => [a.platform, a]));
  return (
    <ul className="st-si-statelist">
      {PLATFORMS.map((platform) => {
        const account = byPlatform.get(platform);
        const status = accountStatus(account);
        return (
          <li key={platform}>
            <span>
              <strong>{PLATFORM_LABELS[platform]}</strong>
              {account?.state === "linked" && account.handle && <small>{account.handle}</small>}
              {account?.state === "linked" && platform === "leetcode" && <NameMatchBadge value={account.nameMatch} />}
              {account?.state === "linked" && <small className="st-si-provenance">{provenanceLabel(account.ownership)}</small>}
            </span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
