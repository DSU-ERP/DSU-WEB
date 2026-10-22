import test from "node:test";
import assert from "node:assert/strict";
import {
  answeredProgress,
  blueprintStatus,
  difficultyLabel,
  durationLabel,
  focusLeftPage,
  idleLabel,
  insightPrompt,
  INTEGRITY_REPEAT_MS,
  integrityCounts,
  integrityThrottle,
  isAnswered,
  levelLabel,
  portionChips,
  releaseLabel,
  severityOf,
} from "../src/features/student/lib/assessment";
import { csvCell, highRiskOf, resultsCsv, type ResultRow } from "../src/features/placement/lib/assessment-results";
import { CampusError, readCampusResponse } from "../src/shared/http/errors";

test("blueprint readiness enforces source, per-section cap, distinct names and duration", () => {
  const ready = blueprintStatus({
    context: "Percentages and market sizing",
    sections: [{ name: "Aptitude", count: 30, type: "mcq" }, { name: "HR", count: 5, type: "short" }],
    duration: 30,
  });
  assert.deepEqual(ready, { total: 35, sourceReady: true, blueprintReady: true, launchReady: true, issues: [] });
  const capped = blueprintStatus({ context: "Percentages and market sizing", sections: [{ name: "Aptitude", count: 31, type: "mcq" }], duration: 30 });
  assert.equal(capped.blueprintReady, false);
  assert.match(capped.issues[0], /between 1 and 30/);
  const messy = blueprintStatus({
    context: "short",
    sections: [{ name: "Tech", count: 30, type: "mcq" }, { name: " tech ", count: 25, type: "mcq" }],
    duration: 200,
  });
  assert.equal(messy.total, 55);
  assert.equal(messy.sourceReady, false);
  assert.equal(messy.launchReady, false);
  assert.ok(messy.issues.some((issue) => /different name/.test(issue)));
  assert.ok(messy.issues.some((issue) => /50 questions/.test(issue)));
});

test("runner progress, idle readout and durations", () => {
  assert.deepEqual(answeredProgress(["q1", "q2", "q3", "q4"], { q1: "0", q2: "  ", q4: "Answer" }), { answered: 2, total: 4, percent: 50 });
  assert.equal(answeredProgress([], {}).percent, 0);
  assert.equal(idleLabel(2), "Active now");
  assert.equal(idleLabel(42), "Idle 42s");
  assert.equal(idleLabel(65), "Idle 1m 05s");
  assert.equal(durationLabel(30), "Under a minute");
  assert.equal(durationLabel(754), "13 min");
  assert.equal(durationLabel(3900), "1 h 05 min");
  assert.equal(durationLabel(undefined), "Not recorded");
});

test("labels for levels, difficulty, portions and answer release", () => {
  assert.equal(levelLabel(1), "L1 · Foundation");
  assert.equal(levelLabel(5), "L5 · Interview challenge");
  assert.equal(levelLabel(6), "Level 6");
  assert.equal(difficultyLabel("hard"), "Hard");
  assert.equal(difficultyLabel("assigned"), "Set by placement office");
  assert.deepEqual(portionChips("Ratios, series;\nRatios\n • Data tables ,"), ["Ratios", "series", "Data tables"]);
  assert.deepEqual(portionChips(""), []);
  assert.equal(portionChips(Array.from({ length: 20 }, (_, i) => "Topic " + i).join(",")).length, 12);
  assert.equal(releaseLabel("2026-10-20T10:30:00.000Z"), "Answers release after 20 Oct 2026, 4:00 pm.");
  assert.equal(releaseLabel(null), "Answers are released after the test closes.");
  const prompt = insightPrompt("Assigned reasoning check", "Practise parity rules", ["Reasoning", "Reasoning"]);
  assert.match(prompt, /Practise parity rules \(sections: Reasoning\)/);
  assert.ok(insightPrompt("t", "x".repeat(2000)).length < 700);
});

test("integrity severity mirrors the server and feeds officer exports", () => {
  assert.equal(severityOf("clipboard"), "high");
  assert.equal(severityOf("tab-hidden"), "medium");
  assert.equal(severityOf("window-blur"), "low");
  assert.deepEqual(integrityCounts([{ kind: "fullscreen-exit" }, { kind: "inactive" }, { kind: "window-blur" }]), { total: 3, high: 1, medium: 1, low: 1 });
  const rows: ResultRow[] = [
    {
      identity: { name: '=HYPERLINK("x")', usn: "U001" },
      status: "completed",
      started_at: "2026-10-19T09:00:00Z",
      result: { score: 6, maximum: 10, percentage: 60, durationSeconds: 754 },
      integrity: [{ kind: "clipboard" }, { kind: "tab-hidden" }],
      highRisk: 1,
    },
    { identity: { name: "Old row", usn: "U002" }, status: "submitted", started_at: "2026-10-19T09:00:00Z", result: null, integrity: [{ kind: "fullscreen-exit" }] },
  ];
  assert.equal(highRiskOf(rows[1]), 1, "older API rows are counted locally");
  const csv = resultsCsv(rows).split("\r\n");
  assert.equal(csv[0], '"USN","Name","Status","Score","Maximum","Percentage","Duration (min)","Browser events","High-risk events"');
  assert.equal(csv[1], '"U001","\'=HYPERLINK(""x"")","completed","6","10","60","13","2","1"');
  assert.equal(csv[2], '"U002","Old row","submitted","","","","","1","1"');
  assert.equal(csvCell("-1"), "\"'-1\"");
});

test("browser events: per-kind throttle and real focus loss only", () => {
  const allow = integrityThrottle();
  assert.equal(allow("window-blur", 1000), true);
  assert.equal(allow("window-blur", 2500), false, "a repeat within the window is dropped");
  assert.equal(allow("fullscreen-exit", 2600), true, "a different kind still goes out");
  assert.equal(allow("window-blur", 1000 + INTEGRITY_REPEAT_MS), true);
  assert.equal(allow("inactive", 0), true, "a first event at time zero is not throttled");
  const away = { hidden: false, hasFocus: false, now: 5000, quietUntil: 0 };
  assert.equal(focusLeftPage(away), true);
  assert.equal(focusLeftPage({ ...away, hidden: true }), false, "a hidden tab is recorded as tab-hidden");
  assert.equal(focusLeftPage({ ...away, hasFocus: true }), false, "focus came back or moved into a frame");
  assert.equal(focusLeftPage({ ...away, quietUntil: 5001 }), false, "fullscreen change or leave-page prompt");
  assert.equal(isAnswered("  \n"), false);
  assert.equal(isAnswered("0"), true);
  assert.equal(isAnswered(undefined), false);
});

test("deliberate grading and blueprint failures reach the student", async () => {
  for (const code of ["INVALID_GRADING", "BLUEPRINT_MISMATCH"]) {
    const failure = await readCampusResponse(
      Response.json({ error: { code, message: "Retry evaluation." } }, { status: 502 }),
    ).catch((error: CampusError) => error);
    assert.ok(failure instanceof CampusError);
    assert.deepEqual([failure.status, failure.message, failure.code], [502, "Retry evaluation.", code]);
  }
});
