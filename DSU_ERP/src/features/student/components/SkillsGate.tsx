import "server-only";
import { redirect } from "next/navigation";
import { workspaceAccess } from "@/shared/auth/workspace";
import { skillsGateRedirect } from "../lib/skills";

/**
 * Server-side skills onboarding gate for client navigations, rendered in the
 * student layout's @gate slot, which re-renders with every student page (the
 * layout itself does not, and gates full page loads before rendering). Same
 * rule as the layout; it renders nothing and only redirects. Access failures
 * are left to the layout, which already explains them.
 */
export async function SkillsGate({ path }: { path: string[] }) {
  let target: string | null = null;
  try {
    target = skillsGateRedirect(await workspaceAccess(), path);
  } catch {
    return null;
  }
  if (target) redirect(target);
  return null;
}
