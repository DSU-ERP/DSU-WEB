import type { Row } from "./types";

/** Compare SQL DATE strings against the server's campus date, never browser locale. */
export function driveDateWarning(drive: Row, today: string): string | null {
  const date = typeof drive.drive_date === "string" ? drive.drive_date.slice(0, 10) : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < today && ["upcoming", "ongoing"].includes(String(drive.status)))
    return "Drive date has passed. Review recorded status.";
  return null;
}
