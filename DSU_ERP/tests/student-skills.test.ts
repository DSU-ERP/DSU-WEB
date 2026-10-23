import test from "node:test";
import assert from "node:assert/strict";
import {
  accountStatus,
  activityRows,
  cgpaText,
  checkFigures,
  checkToken,
  githubReturnNotice,
  normalizeHandle,
  placementPreview,
  provenanceLabel,
  rankReason,
  rankText,
  resumeStep,
  safeGitHubUrl,
  sectionStep,
  skillRouteAllowed,
  skillsGateRedirect,
  studentSegments,
  submittedSummary,
  summarySources,
  toggleFeatured,
  type PlatformAccount,
  type SkillsProfile,
} from "../src/features/student/lib/skills";
import { CampusError, readCampusResponse } from "../src/shared/http/errors";

const account = (over: Partial<PlatformAccount>): PlatformAccount => ({
  platform: "leetcode", state: "linked", handle: "coder", profileUrl: "https://leetcode.com/u/coder/", authMethod: "link_only",
  ownership: "student_submitted", visible: true, syncStatus: "not_applicable", syncError: null, lastSyncedAt: null, submitted: {}, metrics: [], ...over,
});

// Shape of GET /student/skills/profile from the backend profile integration test.
function profile(): SkillsProfile {
  return {
    academic: { name: "Asha Target", usn: "T01", department: "CSE", departmentName: "CSE Engineering", program: "B.Tech", batch: "2027", semester: "7", cgpa: "8.52", category: "advanced", categoryLabel: "Advanced", eligible: true, provenance: "institution_verified" },
    ranking: { batchRank: 3, categoryRank: 3, batchSize: 6, categorySize: 4, scope: "batch" },
    onboarding: { version: 2, currentVersion: 2, complete: true, completedAt: "2026-10-22T10:00:00Z", identityConfirmedAt: "2026-10-22T10:00:00Z", consentedAt: "2026-10-22T10:00:00Z", sections: { identity: true, github: true, leetcode: true, hackerrank: true, linkedin: true, huggingface: false, kaggle: true, visibility: true }, missing: [] },
    visibility: { platforms: true, projects: true, activity: true, summary: true },
    accounts: [
      account({ platform: "github", handle: "asha-dev", profileUrl: "https://github.com/asha-dev", authMethod: "github_app", ownership: "platform_verified", syncStatus: "completed", lastSyncedAt: "2026-10-22T10:00:00Z", metrics: [{ metric: "repos.public", label: "Public repositories", value: 14, verification: "platform_verified" }] }),
      account({ submitted: { solved: 240, contestRating: 1650 } }),
      account({ platform: "hackerrank", state: "declared_none", handle: null, profileUrl: null, authMethod: "none", ownership: "unavailable" }),
      account({ platform: "linkedin", handle: "asha", profileUrl: "https://www.linkedin.com/in/asha", visible: false }),
    ],
    github: {
      repositories: [{ repoId: "2", name: "bravo", fullName: "asha-dev/bravo" }],
      featured: [
        { position: 1, source: "github_pinned", repo: { repoId: "1", name: "alpha", fullName: "asha-dev/alpha" } },
        { position: 2, source: "student_selected", repo: { repoId: "2", name: "bravo", fullName: "asha-dev/bravo" } },
      ],
      pinned: [],
      activity: [
        { metric: "contributions.total_12m", label: "Contributions", value: 12, verification: "platform_verified" },
        { metric: "activity.current_streak", label: "Current", value: 2, verification: "platform_verified" },
        { metric: "contributions.lines_added_52w", label: "Lines", value: { value: 40, counted: 2, eligible: 4, pending: 0 }, verification: "platform_verified" },
      ],
    },
    summary: { id: "s1", createdAt: "2026-10-22T10:00:00Z", model: "m", content: { summary: { text: "Grounded.", evidence: ["e1"] } }, evidence: [], reviewedAt: null, hidden: false, provenance: "ai_generated" },
    readiness: { status: "descriptive", items: [] },
    revision: 4,
  };
}

test("state and provenance labels never overstate verification", () => {
  assert.equal(accountStatus(undefined).label, "Not provided");
  assert.equal(accountStatus(account({ state: "declared_none" })).label, "Does not use");
  assert.equal(accountStatus(account({ state: "disconnected" })).label, "Not provided");
  assert.equal(accountStatus(account({})).label, "Linked");
  assert.equal(accountStatus(account({ syncStatus: "pending" })).label, "Sync pending");
  const failed = accountStatus(account({ syncStatus: "failed", syncError: "PROVIDER_UNAVAILABLE" }));
  assert.equal(failed.label, "Sync failed");
  assert.match(failed.detail!, /retry automatically/);
  assert.equal(accountStatus(account({ syncStatus: "failed", syncError: "CREDENTIAL_INVALID" })).label, "Reconnect required");
  assert.equal(provenanceLabel("student_submitted"), "Student submitted, not verified by DSU");
  assert.equal(provenanceLabel("institution_verified"), "Institution record");
  assert.equal(provenanceLabel("ai_generated"), "AI generated");
  assert.equal(provenanceLabel("something-else"), "Unavailable");
});

test("handles mirror the backend allowlist and rebuild URLs", () => {
  assert.deepEqual(normalizeHandle("leetcode", "https://leetcode.com/u/coder/"), { handle: "coder", profileUrl: "https://leetcode.com/u/coder/" });
  assert.equal(normalizeHandle("leetcode", "https://leetcode.com.evil.com/u/x"), null);
  assert.equal(normalizeHandle("leetcode", "http://leetcode.com/u/x"), null);
  assert.equal(normalizeHandle("leetcode", "https://leetcode.com/problems"), null);
  assert.equal(normalizeHandle("linkedin", "https://in.linkedin.com/in/student-a")!.profileUrl, "https://www.linkedin.com/in/student-a");
  assert.equal(normalizeHandle("hackerrank", "https://www.hackerrank.com/profile/coder_1")!.handle, "coder_1");
  assert.equal(normalizeHandle("kaggle", "https://www.kaggle.com/competitions"), null);
  assert.equal(normalizeHandle("huggingface", "alice-hf")!.profileUrl, "https://huggingface.co/alice-hf");
  assert.equal(normalizeHandle("github", "octocat"), null, "GitHub needs the connection flow");
});

test("student-submitted figures follow the backend schema", () => {
  const bad = checkFigures("leetcode", { leetcode: { solved: "5", easy: "5", medium: "5", hard: "5" } });
  assert.equal(bad.ok, false);
  assert.match(!bad.ok ? bad.errors.solved : "", /cannot add up/);
  assert.equal(checkFigures("leetcode", { leetcode: { solved: "1.5" } }).ok, false);
  assert.equal(checkFigures("leetcode", { leetcode: { solved: "5001" } }).ok, false);
  assert.deepEqual(checkFigures("leetcode", { leetcode: { solved: "120", easy: "60", medium: "50", hard: "10", contestRating: "1650.5" } }), {
    ok: true, data: { solved: 120, easy: 60, medium: 50, hard: 10, contestRating: 1650.5 },
  });
  const cert = checkFigures("hackerrank", { badges: [{ name: "Python", stars: "7" }], certifications: [{ name: "SQL", url: "https://evil.com/certificates/abc123" }] });
  assert.equal(cert.ok, false);
  assert.deepEqual(Object.keys(!cert.ok ? cert.errors : {}).sort(), ["badges.0.stars", "certifications.0.url"]);
  assert.deepEqual(checkFigures("hackerrank", { badges: [{ name: "Python", stars: "5" }], certifications: [{ name: "SQL", url: "https://www.hackerrank.com/certificates/abc123" }] }), {
    ok: true, data: { badges: [{ name: "Python", stars: 5 }], certifications: [{ name: "SQL", url: "https://www.hackerrank.com/certificates/abc123" }] },
  });
  assert.equal(checkFigures("kaggle", { achievements: [{ title: "<b>x</b>" }] }).ok, false);
  assert.equal(checkFigures("kaggle", { achievements: Array.from({ length: 11 }, () => ({ title: "x" })) }).ok, false);
  assert.deepEqual(submittedSummary("leetcode", { solved: 240, contestRating: 1650 }), ["Problems solved: 240", "Contest rating: 1,650"]);
});

test("only fine-grained tokens are accepted and GitHub return codes are safe", () => {
  assert.match(checkToken("ghp_" + "a".repeat(36))!, /fine-grained/);
  assert.equal(checkToken("github_pat_" + "A".repeat(60)), null);
  assert.equal(githubReturnNotice("connected", null)!.tone, "good");
  assert.match(githubReturnNotice("error", "GITHUB_ACCOUNT_IN_USE")!.text, /another student/);
  assert.equal(githubReturnNotice("error", "<script>")!.text, "GitHub could not be connected. Please try again.");
  assert.equal(githubReturnNotice(undefined, undefined), null);
  assert.equal(safeGitHubUrl("https://github.com/login/oauth/authorize?state=x"), "https://github.com/login/oauth/authorize?state=x");
  assert.equal(safeGitHubUrl("https://github.com.evil.com/x"), null);
  assert.equal(safeGitHubUrl("javascript:alert(1)"), null);
});

test("featured selection keeps order and stops at three", () => {
  let state = toggleFeatured([], "1");
  state = toggleFeatured(state.selected, "2");
  state = toggleFeatured(state.selected, "3");
  assert.deepEqual(state.selected, ["1", "2", "3"]);
  const full = toggleFeatured(state.selected, "4");
  assert.equal(full.full, true);
  assert.deepEqual(full.selected, ["1", "2", "3"]);
  assert.deepEqual(toggleFeatured(state.selected, "2").selected, ["1", "3"]);
});

test("onboarding resumes from server sections and the gate is path aware", () => {
  assert.equal(resumeStep({ sections: {} }), 0);
  assert.equal(resumeStep({ sections: { identity: true, github: true, leetcode: true, linkedin: false } }), 1);
  assert.equal(resumeStep({ sections: { identity: true, github: true, leetcode: true, hackerrank: false, linkedin: true } }), 2);
  assert.equal(resumeStep({ sections: { identity: true, github: true, leetcode: true, hackerrank: true, linkedin: true, visibility: true } }), 3);
  assert.deepEqual(["identity", "kaggle", "visibility"].map(sectionStep), [0, 1, 2]);
  const required = { role: "student", onboardingRequired: true };
  assert.equal(skillsGateRedirect(required, ["dashboard"]), "/student/onboarding");
  assert.equal(skillsGateRedirect(required, ["onboarding"]), null, "no loop on the onboarding page");
  assert.equal(skillsGateRedirect({ role: "student", onboardingRequired: false }, ["onboarding"]), "/student/dashboard");
  assert.equal(skillsGateRedirect({ role: "student", onboardingRequired: false }, ["dashboard"]), null, "no loop on the dashboard");
  assert.equal(skillsGateRedirect({ role: "student" }, ["timetable"]), null, "older backends omit the flag");
  assert.equal(skillsGateRedirect({ role: "placement_officer", onboardingRequired: true }, ["dashboard"]), null);
});

test("one ordering decides the student landing page: registration, then skills onboarding, then the dashboard", () => {
  const at = (registered: boolean | undefined, onboardingRequired: boolean, segments: string[]) =>
    skillsGateRedirect({ role: "student", onboardingRequired, registered }, segments);
  assert.equal(at(false, true, []), "/onboarding", "registration comes first");
  assert.equal(at(false, false, []), "/onboarding");
  assert.equal(at(true, true, []), "/student/onboarding");
  assert.equal(at(true, false, []), "/student/dashboard");
  assert.equal(at(undefined, true, []), null, "without the registration state the landing page decides");
  assert.equal(at(false, true, ["dashboard"]), "/onboarding");
  assert.equal(at(false, true, ["onboarding"]), "/onboarding");
  assert.equal(at(false, false, ["timetable"]), null, "registration alone does not gate other pages");
  assert.deepEqual(studentSegments("/student"), []);
  assert.deepEqual(studentSegments("/student/connections/github"), ["connections", "github"]);
  assert.equal(studentSegments("/studentx/dashboard"), null);
  assert.equal(studentSegments("/placement"), null);
  assert.equal(studentSegments(null), null);
});

test("the proxy allows exactly the skills routes and never the OAuth callback", () => {
  assert.ok(skillRouteAllowed("GET", ["skills", "profile"]));
  assert.ok(!skillRouteAllowed("POST", ["skills", "profile"]));
  assert.ok(skillRouteAllowed("POST", ["skills", "platforms", "kaggle"]));
  assert.ok(skillRouteAllowed("POST", ["skills", "platforms", "github", "refresh"]));
  assert.ok(skillRouteAllowed("POST", ["skills", "platforms", "github", "token"]));
  assert.ok(!skillRouteAllowed("POST", ["skills", "platforms", "github", "callback"]));
  assert.ok(!skillRouteAllowed("POST", ["skills", "platforms", "twitter"]));
  assert.ok(!skillRouteAllowed("POST", ["skills", "platforms", "kaggle", "authorize"]));
  assert.ok(skillRouteAllowed("POST", ["skills", "summary"]));
  assert.ok(!skillRouteAllowed("GET", ["skills", "summary"]));
});

test("numbers are shown as stored and missing activity is unavailable", () => {
  assert.equal(cgpaText("8.5"), "8.50");
  assert.equal(cgpaText(null), "Not recorded");
  assert.equal(rankText(3, 6), "3 of 6");
  assert.equal(rankText(null, 6), "Not ranked");
  assert.equal(rankText(null, null, rankReason(null)), "Not ranked (CGPA not recorded)");
  assert.equal(rankReason("8.52"), undefined);
  const rows = Object.fromEntries(activityRows(profile()).map((r) => [r.key, r]));
  assert.equal(rows["repos.public"].value, "14");
  assert.equal(rows["contributions.total_12m"].value, "12");
  assert.equal(rows["activity.longest_streak"].value, null, "not synced, never invented");
  assert.match(rows["contributions.lines_added_52w"].note!, /2 of 4/);
  assert.equal(rows["leetcode.solved"].provenance, "student_submitted");
  const empty = activityRows({ accounts: [], github: { repositories: [], featured: [], pinned: [], activity: [] } });
  assert.ok(empty.every((r) => r.value === null && r.provenance === "unavailable"));
});

test("placement preview applies visibility the way officers see it", () => {
  const base = profile();
  const shown = placementPreview(base);
  assert.equal(shown.consented, true);
  assert.equal(shown.accounts.find((a) => a.platform === "linkedin"), undefined, "hidden accounts are omitted, as in the SQL");
  assert.deepEqual(shown.hiddenAccounts, ["linkedin"]);
  assert.equal(shown.accounts.find((a) => a.platform === "github")!.handle, "asha-dev");
  assert.equal(shown.accounts.find((a) => a.platform === "hackerrank")!.state, "declared_none");
  assert.equal(shown.featured.length, 2);
  assert.equal(shown.repositories.length, 1);
  assert.ok(shown.summary);
  assert.equal(shown.summaryWithheld, false);
  const hidden = placementPreview({ ...base, visibility: { platforms: false, projects: false, activity: false, summary: false } });
  assert.ok(hidden.accounts.every((a) => a.handle === null && a.metrics.length === 0 && !a.shared));
  assert.deepEqual(hidden.accounts.map((a) => a.state), ["linked", "linked", "declared_none"], "states are always shared");
  assert.deepEqual([hidden.featured, hidden.repositories, hidden.activity, hidden.summary], [[], [], [], null]);
  assert.deepEqual(hidden.hidden, ["platforms", "projects", "activity", "summary"]);
  assert.equal(hidden.academic.cgpa, "8.52", "the official record is always visible");
  assert.equal(placementPreview({ ...base, summary: { ...base.summary!, hidden: true } }).summary, null);
});

test("placement preview mirrors placement.skill_profile for every visibility combination", () => {
  const base = profile();
  const keys = ["platforms", "projects", "activity", "summary"] as const;
  for (let mask = 0; mask < 16; mask++) {
    const visibility = Object.fromEntries(keys.map((k, i) => [k, Boolean(mask & (1 << i))])) as SkillsProfile["visibility"];
    for (const githubVisible of [true, false]) {
      const accounts = base.accounts.map((a) => (a.platform === "github" ? { ...a, visible: githubVisible } : a));
      const view = placementPreview({ ...base, visibility, accounts });
      const label = JSON.stringify({ visibility, githubVisible });
      // Accounts: hidden ones omitted; details only with the platforms switch.
      assert.equal(view.accounts.some((a) => a.platform === "github"), githubVisible, label);
      for (const a of view.accounts) {
        const shared = visibility.platforms && a.state === "linked";
        assert.equal(a.shared, shared, label);
        assert.equal(a.handle !== null, shared, label);
        assert.ok(a.metrics.every((m) => !/^(activity|contributions)\./.test(m.metric)), label);
      }
      // Projects and activity follow their own switch and a shared GitHub
      // account, never the platforms switch.
      assert.equal(view.featured.length, visibility.projects && githubVisible ? 2 : 0, label);
      assert.equal(view.repositories.length, visibility.projects && githubVisible ? 1 : 0, label);
      assert.equal(view.activity.length, visibility.activity && githubVisible ? 3 : 0, label);
      // The fixture summary cites only academic evidence, so the summary switch alone decides.
      assert.equal(view.summary !== null, visibility.summary, label);
      assert.equal(view.summaryWithheld, false, label);
    }
  }
});

test("placement preview shares only platform states before consent and withholds summaries built on hidden data", () => {
  const base = profile();
  const pending = placementPreview({ ...base, onboarding: { ...base.onboarding, complete: false, consentedAt: null } });
  assert.equal(pending.consented, false);
  assert.deepEqual(pending.accounts.map((a) => [a.platform, a.state, a.handle, a.metrics.length, a.shared]), [
    ["github", "linked", null, 0, false],
    ["leetcode", "linked", null, 0, false],
    ["hackerrank", "declared_none", null, 0, false],
  ]);
  assert.deepEqual([pending.featured, pending.repositories, pending.activity, pending.summary, pending.summaryWithheld], [[], [], [], null, false]);

  const evidence = [
    { id: "e1", kind: "academic", label: "CGPA", value: "8.52", provenance: "institution_verified" },
    { id: "e2", kind: "project", label: "alpha", value: "x", provenance: "platform_verified" },
    { id: "e3", kind: "submitted", platform: "leetcode", label: "Solved", value: "240", provenance: "student_submitted" },
    { id: "e4", kind: "activity", label: "Streak", value: "2", provenance: "platform_verified" },
  ];
  assert.deepEqual(summarySources(evidence), ["activity", "platforms:leetcode", "projects"]);
  const cited = { ...base, summary: { ...base.summary!, evidence } };
  assert.ok(placementPreview(cited).summary, "every cited group is shared");
  for (const visibility of [
    { platforms: false, projects: true, activity: true, summary: true },
    { platforms: true, projects: false, activity: true, summary: true },
    { platforms: true, projects: true, activity: false, summary: true },
  ]) {
    const view = placementPreview({ ...cited, visibility });
    assert.deepEqual([view.summary, view.summaryWithheld], [null, true], JSON.stringify(visibility));
  }
  const leetcodeHidden = placementPreview({ ...cited, accounts: cited.accounts.map((a) => (a.platform === "leetcode" ? { ...a, visible: false } : a)) });
  assert.deepEqual([leetcodeHidden.summary, leetcodeHidden.summaryWithheld], [null, true], "a hidden account withholds it");
  const githubGone = placementPreview({ ...cited, accounts: cited.accounts.filter((a) => a.platform !== "github") });
  assert.equal(githubGone.summaryWithheld, true, "projects need a shared GitHub account");
  const switchedOff = placementPreview({ ...cited, visibility: { ...cited.visibility, summary: false } });
  assert.deepEqual([switchedOff.summary, switchedOff.summaryWithheld], [null, false], "a hidden summary is not called withheld");
  const unknownPlatform = { ...base, summary: { ...base.summary!, evidence: [{ id: "x", kind: "metric", label: "?", value: "1", provenance: "platform_verified" }] } };
  assert.equal(placementPreview(unknownPlatform).summaryWithheld, true, "unknown groups fail closed");
});

test("skills error codes and extra fields reach the student", async () => {
  const fail = async (body: unknown, status: number) => {
    try {
      await readCampusResponse(Response.json(body, { status }));
    } catch (error) {
      return error as CampusError;
    }
    throw new Error("expected failure");
  };
  const incomplete = await fail({ error: { code: "ONBOARDING_INCOMPLETE", message: "Complete every required section before finishing.", missing: ["identity", "github"], requestId: "r" } }, 409);
  assert.deepEqual(incomplete.details, { missing: ["identity", "github"] });
  const fields = await fail({ error: { code: "INVALID_SUBMITTED_FIELDS", message: "Check the figures you entered.", fields: ["solved"] } }, 400);
  assert.deepEqual(fields.details, { fields: ["solved"] });
  const limit = await fail({ error: { code: "REFRESH_LIMIT", message: "You can refresh this account once every 10 minutes.", retryAfterSeconds: 540 } }, 429);
  assert.equal(limit.message, "You can refresh this account once every 10 minutes.");
  assert.deepEqual(limit.details, { retryAfterSeconds: 540 });
  const notConfigured = await fail({ error: { code: "GITHUB_APP_NOT_CONFIGURED", message: "GitHub connection is not configured on this server yet." } }, 503);
  assert.equal(notConfigured.message, "GitHub connection is not configured on this server yet.");
  const gate = await fail({ error: { code: "ONBOARDING_REQUIRED", message: "Complete your skills onboarding to open the dashboard." } }, 403);
  assert.equal(gate.code, "ONBOARDING_REQUIRED");
  const junk = await fail({ error: { code: "PROFILE_CHANGED", message: "Changed.", revision: "x", missing: ["<b>"] } }, 409);
  assert.equal(junk.details, undefined);
});
