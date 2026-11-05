import { test } from "node:test";
import assert from "node:assert/strict";
import {
  interpret,
  validateDraft,
  safeWebUrl,
} from "../src/features/placement/lib/assistantRules";
import { academicYearFor, csv, queryFrom, href } from "../src/features/placement/lib/types";
test("assistant tools retrieve distinct requested sources", () => {
  for (const [prompt, tool] of [
    ["Batch 2028 summary", "batch"],
    ["Recent drives", "drives"],
    ["Placement summary", "placement"],
    ["Master test results", "tests"],
    ["Find career skills", "talent"],
    ["CGPA >= 8.499 candidates", "candidates"],
    ["Search web: graduate jobs", "web"],
  ])
    assert.equal(interpret(prompt).tool, tool);
  assert.equal(interpret("CGPA >= 8.499 candidates").minimum, "8.499");
  assert.equal(interpret("Find student Example Name").search, "Example Name");
  assert.equal(interpret("Batch 2028 summary").batch, "2028");
});
test("email draft validates selected identity and prevents header injection", () => {
  const draft = {
    student_id: "00000000-0000-4000-8000-000000000001",
    subject: "Interview",
    body: "Please confirm your availability.",
  };
  assert.deepEqual(validateDraft(draft), draft);
  for (const changes of [
    { student_id: "someone@example.invalid" },
    { subject: "Hello\r\nBcc: attacker@example.invalid" },
    { body: "" },
    { body: "x".repeat(10001) },
  ])
    assert.throws(() => validateDraft({ ...draft, ...changes }));
});
test("external result URLs cannot execute scripts", () => {
  assert.equal(safeWebUrl("javascript:alert(1)"), null);
  assert.equal(safeWebUrl("file:///secret"), null);
  assert.equal(
    safeWebUrl("https://example.org/jobs"),
    "https://example.org/jobs",
  );
});
test("exports quote cells and neutralize spreadsheet formulas", () => {
  const output = csv(
    ["Name", "Value"],
    [
      ["Example, Student", '=HYPERLINK("https://example.invalid")'],
      ["Line\nbreak", "@command"],
    ],
  );
  assert.ok(output.includes('"Example, Student"'));
  assert.ok(output.includes('"\'=HYPERLINK(""https://example.invalid"")"'));
  assert.ok(output.includes('"\'@command"'));
});
test("drill-down preserves cohort filters but resets pagination", () => {
  const q = queryFrom({
    batch: "2028",
    department: "CSE",
    page: "3",
    company: "id",
    unknown: "ignored",
  });
  assert.equal(q.unknown, undefined);
  assert.equal(
    href("students", q, { category: "medium", page: undefined }),
    "/placement/students?batch=2028&department=CSE&company=id&category=medium",
  );
});

test("new drives derive the academic year from the passing-out batch", () => {
  assert.equal(academicYearFor("2027"), "2026-27");
  assert.equal(academicYearFor("2030"), "2029-30");
  assert.equal(academicYearFor("2100"), "");
  assert.equal(academicYearFor(""), "");
  assert.match(academicYearFor("2027"), /^20[0-9]{2}-([0-9]{2}|20[0-9]{2})$/);
});
