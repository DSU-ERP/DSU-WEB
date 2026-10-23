import test from "node:test";
import assert from "node:assert/strict";
import { academicStanding, applicationStage, daysUntil, deadlineLabel, plural, readinessChecklist, statusText, wordCount } from "../src/features/student/lib/progress";

test("deadlines count campus days and close after the deadline date", () => {
  assert.equal(daysUntil("2026-10-25", "2026-10-19"), 6);
  assert.deepEqual(deadlineLabel("2026-10-19", "2026-10-19"), { text: "Closes today", tone: "bad", open: true });
  assert.equal(deadlineLabel("2026-10-20", "2026-10-19").text, "Closes tomorrow");
  assert.equal(deadlineLabel("2026-10-18", "2026-10-19").open, false);
  assert.equal(deadlineLabel("2026-11-30", "2026-10-19").tone, "neutral");
  assert.equal(deadlineLabel(null).open, true);
});

test("academic standing uses the stored-decimal placement bands", () => {
  assert.equal(academicStanding("8.50").band, "Advanced");
  assert.equal(academicStanding("6.75").eligible, true);
  assert.equal(academicStanding("6.74").eligible, false);
  assert.match(academicStanding("6.40").note, /0\.35 below/);
  assert.equal(academicStanding(null).value, "Not recorded");
  assert.equal(academicStanding("").eligible, null);
  assert.equal(academicStanding("11").band, "Unclassified");
});

test("readiness checklist reports completed steps", () => {
  const result = readinessChecklist({ onboarded: true, resume: false, sessions: 2, assessments: 0, applications: 1 });
  assert.equal(result.done, 3);
  assert.equal(result.percent, 60);
  assert.deepEqual(result.steps.filter((s) => !s.done).map((s) => s.key), ["resume", "assessment"]);
});

test("application stage follows the 1-based awaiting round", () => {
  const rounds = ["Aptitude", "Technical", "HR"];
  assert.equal(applicationStage(null, rounds), null);
  assert.equal(applicationStage({ status: "registered", current_round: 1 }, rounds)?.label, "Round 1 of 3: Aptitude (upcoming)");
  assert.equal(applicationStage({ status: "in-progress", current_round: 2 }, rounds)?.label, "Round 2 of 3: Technical");
  assert.equal(applicationStage({ status: "rejected", current_round: 2 }, rounds)?.label, "Not selected in round 2");
  assert.equal(applicationStage({ status: "selected", current_round: 4 }, rounds)?.finished, true);
});

test("small text helpers", () => {
  assert.equal(plural(1, "minute"), "1 minute");
  assert.equal(plural(3, "minute"), "3 minutes");
  assert.equal(wordCount("  one two\nthree "), 3);
  assert.equal(wordCount(""), 0);
  assert.equal(statusText("in-progress"), "In progress");
});

// Skills intelligence helpers run with the student progress suite.
import "./student-skills.test";
