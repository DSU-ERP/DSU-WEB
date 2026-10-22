import type { InterviewStats } from "./interview-types";
export function interviewActivity(stats: Pick<InterviewStats, "daily" | "answerDays">, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  const start = Date.parse(today + "T00:00:00Z");
  const daily = new Map(stats.daily.map((day) => [day.activity_date.slice(0, 10), day]));
  const answers = new Map(stats.answerDays.map((day) => [day.activity_date.slice(0, 10), day.answers]));
  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(start - (29 - index) * 86400000).toISOString().slice(0, 10);
    const item = daily.get(day);
    return { day, sessions: item?.sessions || 0, minutes: Math.round((item?.seconds || 0) / 60 * 10) / 10, answers: answers.get(day) || 0 };
  });
}
