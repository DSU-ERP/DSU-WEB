// One shape for every role. The backend lists only unread items; marking one
// as read removes it from the list (the record is kept with its read time).
export type NotificationItem = {
  id: string;
  source: "personal" | "broadcast";
  kind?: string;
  title: string;
  body: string | null;
  href: string | null;
  created_at: string;
};
export type NotificationList = {
  audience: "student" | "officer" | "company";
  unread: number;
  rows: NotificationItem[];
};

/** Only same-site paths are followed from a notification. */
export function safeHref(href: string | null) {
  return href && /^\/(?!\/)[A-Za-z0-9/_?=&.%-]*$/.test(href) ? href : null;
}

export function noticeTime(value: string, now = Date.now()) {
  const date = new Date(value);
  const minutes = Math.round((now - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
}
