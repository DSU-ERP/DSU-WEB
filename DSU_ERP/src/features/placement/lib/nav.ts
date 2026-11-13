// Officer navigation: a short list of sections in the sidebar, and the pages
// inside each section as tabs at the top of the page. Every existing route
// keeps its URL; this only decides where it is listed.

export type NavTab = { href: string; label: string; also?: string[] };
export type NavSection = { id: string; label: string; href: string; tabs: NavTab[] };

export const routeMatches = (path: string, href: string) =>
  path === href || path.startsWith(`${href}/`);

export function placementNav(competencyTesting = false): NavSection[] {
  return [
    { id: "home", label: "Home", href: "/placement/overview", tabs: [{ href: "/placement/overview", label: "Home" }] },
    {
      id: "drives",
      label: "Drives",
      href: "/placement/drives",
      tabs: [
        { href: "/placement/drives", label: "Drives" },
        { href: "/placement/drive-requests", label: "Company requests" },
      ],
    },
    {
      id: "companies",
      label: "Companies",
      href: "/placement/companies",
      tabs: [
        { href: "/placement/companies", label: "Directory" },
        { href: "/placement/company-reports", label: "Reports" },
      ],
    },
    {
      id: "students",
      label: "Students",
      href: "/placement/students-ranking",
      tabs: [
        { href: "/placement/students-ranking", label: "Ranking" },
        { href: "/placement/categories", label: "Categories" },
        { href: "/placement/student-analytics", label: "Find a student", also: ["/placement/students"] },
        { href: "/placement/tests", label: "Test results" },
        ...(competencyTesting ? [{ href: "/placement/talent-intelligence", label: "Talent intelligence" }] : []),
      ],
    },
    {
      id: "offers",
      label: "Offers",
      href: "/placement/offers",
      tabs: [
        { href: "/placement/offers", label: "All offers" },
        { href: "/placement/multiple-offers", label: "Multiple offers" },
      ],
    },
    {
      id: "insights",
      label: "Insights",
      href: "/placement/insights",
      tabs: [
        { href: "/placement/insights", label: "Summary" },
        { href: "/placement/departments", label: "Departments" },
        { href: "/placement/batch", label: "Batch" },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      href: "/placement/imports",
      tabs: [
        { href: "/placement/imports", label: "Data imports" },
        { href: "/placement/student-tools", label: "Student tools" },
      ],
    },
  ];
}

const tabMatches = (path: string, tab: NavTab) =>
  [tab.href, ...(tab.also ?? [])].some((href) => routeMatches(path, href));

/** The section and tab a path belongs to, or nulls (for example FRIDAY). */
export function activeNav(path: string, sections: NavSection[]) {
  if (path === "/placement") return { section: sections[0], tab: sections[0].tabs[0] };
  for (const section of sections) {
    const tab = section.tabs.find((t) => tabMatches(path, t));
    if (tab) return { section, tab };
  }
  return { section: null, tab: null };
}
