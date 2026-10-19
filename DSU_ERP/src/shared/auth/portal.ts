// A portal is a navigation preference. Authorization always comes from /session.
export type Portal = "student" | "placement-officer";
export function selectedPortal(value: unknown): Portal | null {
  return value === "student" || value === "placement-officer" ? value : null;
}
export function workspaceDestination(value: unknown) {
  const portal = selectedPortal(value);
  return portal ? `/workspace?portal=${portal}` : "/workspace";
}
