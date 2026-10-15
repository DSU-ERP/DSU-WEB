import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseInline,
  parseAnswer,
  groupConversations,
  focusBatch,
  formatDuration,
} from "../src/lib/friday/view";

test("inline formatting keeps only workspace links clickable", () => {
  const out = parseInline(
    "**1,084** eligible. Open [the profile](/placement/students/abc) or [a site](https://evil.example) or /placement/drives/42.",
  );
  assert.deepEqual(out[0], { kind: "strong", text: "1,084" });
  assert.ok(out.some((p) => p.kind === "link" && p.href === "/placement/students/abc"));
  assert.ok(out.some((p) => p.kind === "link" && p.href === "/placement/drives/42"));
  // An outside URL keeps its label as plain text and is never a link.
  assert.ok(out.some((p) => p.kind === "text" && p.text === "a site"));
  assert.ok(!out.some((p) => p.kind === "link" && p.href.startsWith("http")));
});

test("model markup is parsed into data, never passed through as HTML", () => {
  const blocks = parseAnswer('<img src=x onerror="alert(1)"> **hi**');
  assert.equal(blocks.length, 1);
  const first = blocks[0];
  assert.equal(first.kind, "paragraph");
  if (first.kind !== "paragraph") return;
  assert.equal(first.inline[0].kind, "text");
  assert.equal(first.inline[0].text, '<img src=x onerror="alert(1)"> ');
});

test("answers parse into paragraphs, lists, headings and tables", () => {
  const blocks = parseAnswer(
    [
      "## Batch 2026",
      "The batch has 1,420 students.",
      "",
      "- Advanced: 210",
      "- Medium: 874",
      "",
      "1. First",
      "2. Second",
      "",
      "| Branch | Eligible |",
      "|---|---:|",
      "| CSE | 320 |",
      "| ECE | 190 |",
      "",
      "Shall I break it down further?",
    ].join("\n"),
  );
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ["heading", "paragraph", "list", "list", "table", "paragraph"],
  );
  const table = blocks[4];
  assert.equal(table.kind, "table");
  if (table.kind !== "table") return;
  assert.equal(table.head.length, 2);
  assert.equal(table.rows.length, 2);
  // |---|---:| means the second column is numeric and right-aligned.
  assert.deepEqual(table.align, [null, "right"]);
  const ordered = blocks[3];
  assert.ok(ordered.kind === "list" && ordered.ordered && ordered.items.length === 2);
});

test("a lone pipe line without a separator stays a paragraph", () => {
  assert.equal(parseAnswer("| not a table |")[0].kind, "paragraph");
});

test("conversations group by day relative to now", () => {
  const now = new Date(2026, 9, 15, 12, 0, 0);
  const at = (d: number, h = 10) => new Date(2026, 9, d, h).toISOString();
  const groups = groupConversations(
    [
      { id: "a", updated_at: at(15, 9) },
      { id: "b", updated_at: at(14, 23) },
      { id: "c", updated_at: at(10) },
      { id: "d", updated_at: at(1) },
      { id: "e", updated_at: "not a date" },
    ],
    now,
  );
  assert.deepEqual(
    groups.map((g) => [g.label, g.items.map((i) => i.id)]),
    [
      ["Today", ["a"]],
      ["Yesterday", ["b"]],
      ["Previous 7 days", ["c"]],
      ["Older", ["d", "e"]],
    ],
  );
});

test("starter prompts focus on the next graduating batch", () => {
  assert.equal(focusBatch(["2028", "2026", "2027"], 2026), "2026");
  assert.equal(focusBatch(["2028", "2027"], 2026), "2027");
  // Every batch has graduated: use the newest on record.
  assert.equal(focusBatch(["2023", "2024"], 2026), "2024");
  assert.equal(focusBatch([], 2026), null);
  assert.equal(focusBatch(["__missing__"], 2026), null);
});

test("durations are formatted from real measurements only", () => {
  assert.equal(formatDuration(950), "0.9 s");
  assert.equal(formatDuration(12_345), "12.3 s");
  assert.equal(formatDuration(75_000), "1 min 15 s");
  assert.equal(formatDuration(NaN), "");
  assert.equal(formatDuration(-1), "");
});

test("table alignment follows the separator row", () => {
  const [t] = parseAnswer("| a | b | c | d |\n|:--|:-:|--:|---|\n| 1 | 2 | 3 | 4 |");
  assert.ok(t.kind === "table");
  if (t.kind !== "table") return;
  assert.deepEqual(t.align, ["left", "center", "right", null]);
});
