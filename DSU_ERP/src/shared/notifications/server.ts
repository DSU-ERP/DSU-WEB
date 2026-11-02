import "server-only";
import { backendApi } from "@/shared/http/backend";
import type { NotificationList } from "./types";

/** Initial unread notifications for a page. A failure shows an inline retry, not a broken page. */
export async function initialNotifications(): Promise<NotificationList | null> {
  try {
    return (await backendApi<{ data: NotificationList }>("/notifications")).data;
  } catch {
    return null;
  }
}
