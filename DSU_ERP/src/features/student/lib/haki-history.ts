type DatedConversation = { title: string; updated_at: string };

const campusDay = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day")) / 86400000;
};

/** Recents use campus calendar days, independent of the browser's timezone. */
export function groupHakiHistory<T extends DatedConversation>(rows: T[], search = "", now = new Date()) {
  const today = campusDay(now);
  const query = search.trim().toLocaleLowerCase();
  const groups = new Map<string, T[]>();
  const sorted = [...rows].sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0));
  for (const row of sorted) {
    if (query && !row.title.toLocaleLowerCase().includes(query)) continue;
    const date = new Date(row.updated_at);
    const age = Number.isFinite(date.getTime()) ? today - campusDay(date) : Infinity;
    const label = query ? "Search results" : age <= 0 ? "Today" : age === 1 ? "Yesterday" : age < 7 ? "Previous 7 days" : age < 30 ? "Previous 30 days" : "Older";
    const entries = groups.get(label) || [];
    entries.push(row);
    groups.set(label, entries);
  }
  return [...groups].map(([label, conversations]) => ({ label, conversations }));
}
