"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS, SECTIONS } from "@/lib/placement/types";
import { signOut } from "@/app/login/actions";
export function Workspace({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false),
    [theme, setTheme] = useState("light");
  useEffect(() => {
    try {
      setTheme(
        localStorage.getItem("dsu-placement-theme") === "dark"
          ? "dark"
          : "light",
      );
      setCollapsed(localStorage.getItem("dsu-placement-collapsed") === "true");
    } catch {}
  }, []);
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("dsu-placement-theme", next);
    } catch {}
  };
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    try {
      localStorage.setItem("dsu-placement-collapsed", String(!collapsed));
    } catch {}
  };
  return (
    <div
      className={`erp-shell po-shell po-${theme}${collapsed ? " po-collapsed" : ""}`}
    >
      <a href="#placement-content" className="po-skip">
        Skip to content
      </a>
      <aside className="erp-sidebar">
        <Link href="/placement" className="erp-wordmark">
          DSU <span>/ PLACEMENTS</span>
        </Link>
        <p className="erp-eyebrow">PLACEMENT OFFICER</p>
        <nav
          aria-label="Placement Officer navigation"
          id="placement-nav"
          hidden={collapsed}
        >
          {NAV_SECTIONS.map((key) => (
            <Link
              key={key}
              href={`/placement/${key}`}
              aria-current={path === `/placement/${key}` ? "page" : undefined}
            >
              {SECTIONS[key].title}
            </Link>
          ))}
          <Link
            href="/placement/student-analytics"
            aria-current={
              path === "/placement/student-analytics" ? "page" : undefined
            }
          >
            Student analytics
          </Link>
          <Link
            href="/placement/assistants/friday"
            aria-current={path.endsWith("/friday") ? "page" : undefined}
          >
            F.R.I.D.A.Y.
          </Link>
        </nav>
        <div className="erp-sidebar-bottom">
          <span className="erp-role">Placement Officer</span>
          <form action={signOut}>
            <button className="erp-secondary">Sign out ↗</button>
          </form>
        </div>
      </aside>
      <div className="erp-workspace">
        <header className="erp-topbar po-topbar">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-controls="placement-nav"
            aria-expanded={!collapsed}
          >
            {collapsed ? "Show navigation" : "Hide navigation"}
          </button>
          <span>TRAINING & PLACEMENT CELL</span>
          <button type="button" onClick={toggleTheme}>
            Use {theme === "light" ? "dark" : "light"} theme
          </button>
        </header>
        <main id="placement-content" className="erp-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
