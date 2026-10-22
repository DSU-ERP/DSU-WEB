import test from "node:test";
import assert from "node:assert/strict";
import { interviewActivity } from "../src/features/student/lib/interview-activity";
test("interview charts align campus dates, fill gaps with zero and keep minutes separate from answers", () => {
  const days = interviewActivity({ daily: [{ activity_date: "2026-10-20", sessions: 2, seconds: 90 }], answerDays: [{ activity_date: "2026-10-21", answers: 3 }] }, new Date("2026-10-20T20:00:00Z"));
  assert.equal(days.length, 30);
  assert.deepEqual(days.at(-1), { day: "2026-10-21", sessions: 0, minutes: 0, answers: 3 });
  assert.deepEqual(days.at(-2), { day: "2026-10-20", sessions: 2, minutes: 1.5, answers: 0 });
  assert.equal(days[0].day, "2026-09-22");
  assert.ok(days.slice(0, -2).every((day) => day.sessions === 0 && day.answers === 0 && day.minutes === 0));
});
