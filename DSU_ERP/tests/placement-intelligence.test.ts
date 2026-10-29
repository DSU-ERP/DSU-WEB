import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVITY_METRICS,
  HIDDEN_METRICS,
  RANKED_HEADERS,
  chartCount,
  cohortQuery,
  directoryHref,
  directoryQuery,
  donutArcs,
  exactCgpa,
  formatCgpa,
  formatCount,
  formatPercent,
  initials,
  isCategory,
  labelEvery,
  languageShare,
  linePoints,
  linesAddedText,
  metricText,
  metricValueText,
  monthLabel,
  niceScale,
  officerSharing,
  rankReason,
  rankText,
  rankedCsvRows,
  rankedExportHref,
  rankedFilename,
  roundedPercents,
  safeHttps,
  skillStatusDetail,
  type DirectoryRow,
  type StudentIntelligence,
} from "../src/features/placement/lib/intelligence";
import { safeHttps as sharedSafeHttps } from "../src/shared/http/safe-url";
import { csv } from "../src/features/placement/lib/types";

test("formatting never invents values and never prints a dash", () => {
  assert.equal(formatPercent(12.345), "12.3%");
  assert.equal(formatPercent("100.0", 1), "100.0%");
  assert.equal(formatPercent(33.333, 2), "33.33%");
  assert.equal(formatPercent(null), "Not available");
  assert.equal(formatCgpa("8.4999"), "8.50");
  assert.equal(formatCgpa("7"), "7.00");
  assert.equal(formatCgpa(null), "Not available");
  assert.equal(exactCgpa("8.499"), "8.499");
  assert.equal(exactCgpa(null), "Not recorded");
  assert.equal(formatCount(12345), "12,345");
  assert.equal(formatCount(undefined), "Not available");
  assert.equal(rankText(3, 6), "3 of 6");
  assert.equal(rankText(null, 6), "Not ranked");
  assert.equal(rankText(undefined, null, rankReason(null)), "Not ranked (CGPA not recorded)");
  assert.equal(rankReason("7.10"), undefined);
  assert.equal(monthLabel("2026-08"), "Aug 2026");
  assert.equal(initials("Asha  Target"), "AT");
  assert.equal(initials("Madonna"), "M");
  assert.equal(initials(""), "?");
  assert.equal(metricText("14"), "14");
  assert.equal(metricText(["Python", "Go"]), "Python, Go");
  assert.equal(metricText(null), "Unavailable");
  for (const value of [formatPercent(null), formatCgpa(null), exactCgpa(""), metricText(undefined)])
    assert.ok(!value.includes("—"));
});

test("only https profile links are allowed", () => {
  assert.equal(safeHttps("https://leetcode.com/u/asha_lc/"), "https://leetcode.com/u/asha_lc/");
  assert.equal(safeHttps("http://leetcode.com/u/x"), null);
  assert.equal(safeHttps("javascript:alert(1)"), null);
  assert.equal(safeHttps("https://user:pw@example.com"), null);
  assert.equal(safeHttps("/placement/students/1"), null);
  assert.equal(safeHttps(42), null);
  assert.equal(safeHttps, sharedSafeHttps, "the student workspace links with the same rule");
});

test("directory query keeps only documented, valid filters", () => {
  assert.deepEqual(
    directoryQuery({
      batch: "2027",
      department: "CSE",
      search: "  asha ",
      eligibility: "eligible",
      skill: "not_started",
      sort: "cgpa",
      direction: "desc",
      page: "2",
      limit: "500",
      extra: "1",
    }),
    { batch: "2027", department: "CSE", search: "asha", eligibility: "eligible", skill: "not_started", sort: "cgpa", direction: "desc", page: "2" },
  );
  assert.deepEqual(directoryQuery({ batch: "27", sort: "drop", page: "0", eligibility: ["eligible"] }), {});
  assert.deepEqual(cohortQuery({ batch: "2028", department: "ECE", search: "x" }), { batch: "2028", department: "ECE" });
  assert.equal(isCategory("needs-improvement"), true);
  assert.equal(isCategory("elite"), false);
  assert.equal(directoryHref("advanced", { batch: "2027", department: undefined }), "/placement/categories/advanced?batch=2027");
  assert.equal(
    rankedExportHref("medium", { batch: "2027", page: "3", search: "a b" }),
    "/placement/export/ranked?category=medium&batch=2027&search=a+b",
  );
});

test("ranked CSV rows keep ranks, omit ids and stay formula safe", () => {
  const rows: DirectoryRow[] = [
    { id: "11111111-1111-4111-8111-111111111111", usn: "T02", name: "Bala Top", department: "CSE", batch: "2027", semester: "7", cgpa: "9.10", category: "advanced", eligible: true, categoryRank: 1, batchRank: 1, skillStatus: "complete", profileUrl: "/placement/students/11111111-1111-4111-8111-111111111111" },
    { id: "22222222-2222-4222-8222-222222222222", usn: "T03", name: "=HYPERLINK(\"x\")", department: null, batch: "2027", semester: null, cgpa: "8.52", category: "advanced", eligible: null, categoryRank: 3, batchRank: 3, skillStatus: "not_started", profileUrl: "/placement/students/22222222-2222-4222-8222-222222222222" },
  ];
  const body = csv(RANKED_HEADERS, rankedCsvRows(rows));
  assert.ok(body.startsWith("﻿\"Category rank\",\"Batch rank\",\"USN\""));
  assert.ok(body.endsWith("\r\n"));
  const lines = body.slice(1).split("\r\n");
  assert.equal(lines.length, 4);
  assert.equal(lines[1], '"1","1","T02","Bala Top","CSE","2027","7","9.10","Yes","Complete"');
  assert.ok(lines[2].includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(lines[2].endsWith('"Unknown","Not started"'));
  const unranked = csv(RANKED_HEADERS, rankedCsvRows([{ ...rows[0], categoryRank: null, batchRank: null }]));
  assert.ok(unranked.slice(1).split("\r\n")[1].startsWith('"Not ranked","Not ranked","T02"'));
  assert.ok(!body.includes("1111-4111"));
  assert.ok(!body.includes("/placement/students"));
  assert.equal(rankedFilename("advanced", "2027"), "dsu-advanced-2027-ranked.csv");
  assert.equal(rankedFilename("medium", "../x"), "dsu-medium-all-ranked.csv");
});

test("donut percentages and arcs cover exactly the whole ring", () => {
  for (const counts of [[1, 1, 1], [2, 5, 0, 3], [7, 0, 0, 0], [1, 2, 3, 4], [333, 333, 334, 1]]) {
    const percents = roundedPercents(counts);
    assert.equal(Math.round(percents.reduce((a, b) => a + b, 0) * 10), 1000, String(counts));
    const arcs = donutArcs(counts, 60, 60, 56, 36);
    assert.equal(arcs.length, counts.filter((c) => c > 0).length);
    const sweep = arcs.reduce((sum, arc) => sum + (arc.end - arc.start), 0);
    assert.ok(Math.abs(sweep - Math.PI * 2) < 1e-9);
    assert.ok(Math.abs(arcs[0].start) < 1e-12);
    assert.ok(Math.abs(arcs[arcs.length - 1].end - Math.PI * 2) < 1e-9);
    for (const arc of arcs) assert.ok(arc.path.startsWith("M") && arc.path.includes("A"));
  }
  assert.deepEqual(roundedPercents([1, 1, 1]), [33.4, 33.3, 33.3]);
  assert.deepEqual(roundedPercents([0, 0]), [0, 0]);
  assert.deepEqual(donutArcs([0, 0, 0], 60, 60, 56, 36), []);
  // A single segment is drawn as a full ring (two half arcs per edge).
  const [full] = donutArcs([0, 5], 60, 60, 56, 36);
  assert.equal(full.index, 1);
  assert.equal(full.percent, 100);
  assert.equal((full.path.match(/A/g) || []).length, 4);
});

test("chart scales and points", () => {
  assert.deepEqual(niceScale(0), { max: 1, ticks: [0, 1] });
  assert.deepEqual(niceScale(3), { max: 3, ticks: [0, 1, 2, 3] });
  assert.deepEqual(niceScale(37).max, 40);
  const s = niceScale(37);
  assert.ok(s.ticks.length <= 6 && s.ticks.at(-1) === s.max);
  assert.ok(niceScale(1234).max >= 1234);
  assert.deepEqual(linePoints([0, 5, 10], 10).map((p) => [p.x, p.y]), [[0, 100], [50, 50], [100, 0]]);
  assert.deepEqual(linePoints([4], 8).map((p) => [p.x, p.y]), [[50, 50]]);
  assert.deepEqual(linePoints([-3, Number.NaN, 4], 4).map((p) => p.y), [100, 100, 0], "negatives and NaN plot at zero");
  assert.deepEqual([chartCount(-2), chartCount(Number.NaN), chartCount(Infinity), chartCount("7"), chartCount(null), chartCount(3)], [0, 0, 0, 7, 0, 3]);
  assert.equal(labelEvery(24, 6), 4);
  assert.equal(labelEvery(3, 6), 1);
});

test("language share is labelled by repository and sums to 100", () => {
  const share = languageShare([
    { name: "a", primaryLanguage: "Python" },
    { name: "b", primaryLanguage: "Python" },
    { name: "c", primaryLanguage: "TypeScript" },
    { name: "d", primaryLanguage: null },
  ]);
  assert.deepEqual(share.map((l) => [l.language, l.count]), [["Python", 2], ["TypeScript", 1]]);
  assert.equal(share.reduce((a, l) => a + l.percent, 0), 100);
  assert.equal(share[0].total, 3);
  assert.deepEqual(languageShare([]), []);
});

test("activity uses the backend metric keys and formats lines added with coverage", () => {
  assert.deepEqual(ACTIVITY_METRICS.map((m) => m.metric), [
    "contributions.total_12m", "contributions.commits_12m", "contributions.private_12m", "contributions.lines_added_52w",
    "activity.current_streak", "activity.longest_streak", "activity.active_days",
  ]);
  assert.ok(HIDDEN_METRICS.has("activity.calendar"), "the calendar is never rendered as text");
  assert.equal(linesAddedText({ value: 18240, counted: 8, eligible: 8, pending: 0 }), "18,240 lines (8 of 8 repositories counted)");
  assert.equal(linesAddedText({ value: 18240, counted: 8, eligible: 10, pending: 0 }), "18,240 lines (8 of 10 repositories counted; partial)");
  assert.equal(linesAddedText({ value: 40, counted: 2, eligible: 4, pending: 2 }), "40 lines (2 of 4 repositories counted; partial, 2 pending)");
  assert.equal(linesAddedText({ value: 1, counted: 1, eligible: 1 }), "1 line (1 of 1 repository counted)");
  assert.equal(linesAddedText(null), "Unavailable");
  assert.equal(linesAddedText(1200), "1,200 lines");
  assert.equal(metricValueText({ metric: "contributions.lines_added_52w", value: { value: 5, counted: 1, eligible: 2, pending: 1 } }), "5 lines (1 of 2 repositories counted; partial, 1 pending)");
  assert.equal(metricValueText({ metric: "activity.current_streak", value: 5 }), "5");
});

test("officer sharing follows consent and says when a summary was withheld", () => {
  const skills = (onboarding: StudentIntelligence["skills"]["onboarding"]) =>
    ({ skills: { onboarding } as StudentIntelligence["skills"] });
  assert.deepEqual(officerSharing(skills({ complete: false, consented: false })), { consented: false, summaryWithheld: false });
  assert.deepEqual(officerSharing({ ...skills({ complete: true, consented: true }), summaryWithheld: true }), { consented: true, summaryWithheld: true });
  assert.deepEqual(officerSharing({ ...skills({ complete: false, consented: false }), summaryWithheld: true }), { consented: false, summaryWithheld: false });
  assert.equal(officerSharing(skills({ complete: true })).consented, true, "older backends share once complete");
  assert.equal(officerSharing(skills({ complete: false })).consented, false);
  assert.match(skillStatusDetail("complete"), /GitHub, LeetCode, and LinkedIn are linked/);
  assert.match(skillStatusDetail("incomplete"), /disconnected/);
  assert.match(skillStatusDetail("bogus"), /not started/);
});
