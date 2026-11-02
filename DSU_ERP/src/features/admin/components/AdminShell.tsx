"use client";
import { PortalShell, type PortalNavItem } from "@/shared/components/PortalShell";

const NAV: PortalNavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard", match: "exact" },
  { href: "/admin/agent-workflow", label: "Agent workflow", icon: "workflow", match: "prefix" },
];

export function AdminShell({ member, children }: { member: string; children: React.ReactNode }) {
  return (
    <PortalShell wordmark="ADMIN" heading="Administration" member={member} identity="DSU AGENTIC ERP" themeKey="dsu-admin" nav={NAV} bell={false}>
      {children}
    </PortalShell>
  );
}
