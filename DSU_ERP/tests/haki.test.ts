import test from "node:test";
import assert from "node:assert/strict";
import { formatMessage, parseInline } from "../src/features/student/lib/format";
import { groupHakiHistory } from "../src/features/student/lib/haki-history";
import { activitySeries } from "../src/features/student/lib/progress";
import { driveImportDefaults, type DriveImportFields } from "../src/features/placement/lib/driveImport";

test("assistant replies format headings, lists and bold without HTML", () => {
  const blocks = formatMessage(
    "## Verdict\nYou match **most** requirements.\nSecond line\n\n1. Add tests\n2) Quantify outcomes\n   with numbers\n- Practise\n* Apply\n\n### Next <b>step</b>\n<script>alert(1)</script>",
  );
  assert.deepEqual(blocks.map((b) => b.kind), ["heading", "paragraph", "list", "list", "heading", "paragraph"]);
  assert.deepEqual(blocks[0], { kind: "heading", level: 1, inline: [{ text: "Verdict", bold: false }] });
  assert.deepEqual(blocks[1], {
    kind: "paragraph",
    lines: [
      [{ text: "You match ", bold: false }, { text: "most", bold: true }, { text: " requirements.", bold: false }],
      [{ text: "Second line", bold: false }],
    ],
  });
  const ordered = blocks[2];
  assert.ok(ordered.kind === "list" && ordered.ordered && ordered.start === 1);
  assert.deepEqual(ordered.items.map((item) => item.map((p) => p.text).join("")), ["Add tests", "Quantify outcomes with numbers"]);
  const bullets = blocks[3];
  assert.ok(bullets.kind === "list" && !bullets.ordered && bullets.items.length === 2);
  assert.deepEqual(blocks[4], { kind: "heading", level: 2, inline: [{ text: "Next <b>step</b>", bold: false }] });
  // Markup stays literal text for React to escape.
  assert.deepEqual(blocks[5], { kind: "paragraph", lines: [[{ text: "<script>alert(1)</script>", bold: false }]] });
});

test("bold markers need content and unmatched markers stay literal", () => {
  assert.deepEqual(parseInline("a ** b"), [{ text: "a ** b", bold: false }]);
  assert.deepEqual(parseInline("**x** and **y**"), [
    { text: "x", bold: true },
    { text: " and ", bold: false },
    { text: "y", bold: true },
  ]);
  assert.deepEqual(formatMessage("5. Starts at five").at(0), {
    kind: "list", ordered: true, start: 5, items: [[{ text: "Starts at five", bold: false }]],
  });
  assert.deepEqual(formatMessage(""), []);
  assert.deepEqual(formatMessage("## Skills for C#").at(0), {
    kind: "heading", level: 1, inline: [{ text: "Skills for C#", bold: false }],
  });
  assert.deepEqual(formatMessage("### Plan ##").at(0), { kind: "heading", level: 2, inline: [{ text: "Plan", bold: false }] });
});

test("assistant formatting preserves code, paragraph breaks and safe links", () => {
  const blocks = formatMessage("A short answer.\n\n## Your next steps\n\n1. Test `query()`\n2. Read [the guide](https://example.org/guide)\n\n> Keep the result specific.\n> Explain the trade-off.\n\n```js\nconst heading = '## literal';\n  run();\n```\n\n---\n\nA final *thought*.");
  assert.deepEqual(blocks.map(b => b.kind), ["paragraph", "heading", "list", "quote", "code", "divider", "paragraph"]);
  assert.deepEqual(blocks[4], { kind: "code", language: "js", text: "const heading = '## literal';\n  run();" });
  assert.deepEqual(parseInline("[unsafe](javascript:alert) and `a < b`"), [
    { text: "unsafe", bold: false }, { text: " and ", bold: false }, { text: "a < b", bold: false, code: true },
  ]);
  assert.deepEqual(parseInline("[guide](https://example.org)"), [{ text: "guide", bold: false, href: "https://example.org/" }]);
  assert.deepEqual(formatMessage("```text\nunfinished fence"), [{ kind: "code", language: "text", text: "unfinished fence" }]);
});

test("older flattened replies recover explicit headings and sequential list items", () => {
  const blocks = formatMessage("I cannot verify live vacancies. ## How to check openings 1. Choose a role. 2. Check the criteria. 3. Apply through the employer.");
  assert.deepEqual(blocks.map(b => b.kind), ["paragraph", "heading", "list"]);
  const list = blocks[2];
  assert.ok(list.kind === "list" && list.items.length === 3);
  assert.deepEqual(formatMessage("A CGPA of 8.2 and version 2.0 are evidence, not list markers.").map(b => b.kind), ["paragraph"]);
  assert.deepEqual(formatMessage("```text\nExample ## heading 1. first 2. second\n```"), [{ kind: "code", language: "text", text: "Example ## heading 1. first 2. second" }]);
});

test("Haki recents group campus days across midnight and search without mutating history", () => {
  const rows = [
    { title: "SQL plan", updated_at: "2026-10-20T18:29:00Z" },
    { title: "Resume review", updated_at: "2026-10-19T09:00:00Z" },
    { title: "Interview practice", updated_at: "2026-10-20T18:31:00Z" },
    { title: "Old plan", updated_at: "2026-08-01T00:00:00Z" },
    { title: "Unknown date", updated_at: "invalid" },
    { title: "Skill roadmap", updated_at: "2026-10-10T08:00:00Z" },
  ];
  const groups = groupHakiHistory(rows, "", new Date("2026-10-20T19:00:00Z"));
  assert.deepEqual(groups.map(group => group.label), ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"]);
  assert.equal(groups[0].conversations[0].title, "Interview practice");
  assert.equal(groups[1].conversations[0].title, "SQL plan");
  assert.equal(rows[0].title, "SQL plan", "sorting does not mutate server data");
  assert.deepEqual(groupHakiHistory(rows, "  RESUME  ").map(group => [group.label, group.conversations[0].title]), [["Search results", "Resume review"]]);
  assert.deepEqual(groupHakiHistory(rows, "no match"), []);
});

test("the activity strip covers fourteen campus days with real counts only", () => {
  const series = activitySeries(
    [
      { day: "2026-10-19", count: 2 },
      { day: "2026-10-10", count: 1 },
      { day: "2026-10-01", count: 5 }, // outside the window
      { day: "2026-10-12", count: -3 }, // invalid counts are ignored
    ],
    "2026-10-19",
  );
  assert.equal(series.length, 14);
  assert.equal(series[0].day, "2026-10-06");
  assert.deepEqual(series.at(-1), { day: "2026-10-19", count: 2 });
  assert.equal(series.find((d) => d.day === "2026-10-10")?.count, 1);
  assert.equal(series.reduce((sum, d) => sum + d.count, 0), 3);
  assert.equal(activitySeries(undefined, "2026-03-01", 3)[0].day, "2026-02-27");
});

test("drive PDF suggestions map to campus records and report what does not match", () => {
  const fields: DriveImportFields = {
    company_name: "acme  systems", title: "Graduate Engineer", package_lpa: 8, location: "Bengaluru",
    drive_date: "2026-11-20", registration_deadline: "", min_cgpa: null, max_backlogs: 0,
    branches: ["cse", "Mechatronics"], skills: "SQL", description: "", rounds: ["Aptitude", "HR"],
    required_documents: "", job_category: "Software / IT", employment_type: "full-time", openings: null, contact: "hr@acme.example",
  };
  const { prefill, notes } = driveImportDefaults(
    fields,
    [{ id: "c1", name: "Acme Systems" }, { id: "c2", name: "Other" }],
    ["CSE", "ISE", "__missing__"],
  );
  assert.equal(prefill.company_id, "c1");
  assert.deepEqual(prefill.branches, ["CSE"]);
  assert.equal(prefill.max_backlogs, 0);
  assert.equal(prefill.min_cgpa, undefined);
  assert.equal(prefill.registration_deadline, undefined);
  assert.equal("published" in prefill, false);
  assert.deepEqual(prefill.rounds, ["Aptitude", "HR"]);
  assert.ok(notes.some((n) => n.includes("Mechatronics")));
  assert.ok(notes.some((n) => n.includes("hr@acme.example")));
  const unknown = driveImportDefaults({ ...fields, company_name: "Nova" }, [{ id: "c1", name: "Acme Systems" }], []);
  assert.equal(unknown.prefill.company_id, undefined);
  assert.match(unknown.notes[0], /Nova/);
});
