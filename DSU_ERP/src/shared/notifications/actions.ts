"use server";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import type { NotificationList } from "./types";

// The backend decides whose notifications these are from the signed-in
// account; nothing here takes a role or user id from the browser.
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const failure = (error: unknown): { ok: false; error: string } => ({
  ok: false,
  error: error instanceof CampusError ? error.message : "Notifications could not be loaded. Try again.",
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listNotifications(): Promise<Result<NotificationList>> {
  try {
    return { ok: true, data: (await backendApi<{ data: NotificationList }>("/notifications")).data };
  } catch (error) {
    return failure(error);
  }
}

export async function readNotification(id: string, source: "personal" | "broadcast"): Promise<Result<{ read: boolean }>> {
  if (!uuid.test(id) || !["personal", "broadcast"].includes(source)) return { ok: false, error: "Invalid notification." };
  try {
    const response = await backendApi<{ data: { read: boolean } }>(`/notifications/${id}/read`, {
      method: "POST",
      body: JSON.stringify({ source }),
    });
    return { ok: true, data: response.data };
  } catch (error) {
    return failure(error);
  }
}

export async function readAllNotifications(): Promise<Result<{ read: boolean }>> {
  try {
    const response = await backendApi<{ data: { read: boolean } }>("/notifications/read-all", { method: "POST", body: "{}" });
    return { ok: true, data: response.data };
  } catch (error) {
    return failure(error);
  }
}
