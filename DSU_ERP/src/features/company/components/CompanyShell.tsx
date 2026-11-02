"use client";
import { PortalShell, type PortalNavItem } from "@/shared/components/PortalShell";

const NAV: PortalNavItem[] = [
  { href: "/company", label: "Dashboard", icon: "dashboard", match: "exact" },
  { href: "/company/drives", label: "Drives", icon: "drives", match: "prefix", also: [] },
  { href: "/company/requests/new", label: "Submit a drive", icon: "submit", match: "exact" },
  { href: "/company/friday", label: "F.R.I.D.A.Y.", icon: "friday", match: "prefix", friday: true },
];

/** The company portal frame: same visual system as the placement workspace. */
export function CompanyShell({ company, member, children }: { company: string; member: string; children: React.ReactNode }) {
  return (
    <PortalShell
      wordmark="RECRUITERS"
      heading={company}
      member={member}
      identity="DSU CAMPUS PLACEMENTS"
      themeKey="dsu-company"
      nav={NAV}
      flush={["/company/friday"]}
    >
      {children}
    </PortalShell>
  );
}
