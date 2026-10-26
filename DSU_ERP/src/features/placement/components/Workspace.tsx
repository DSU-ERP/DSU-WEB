"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Award,
  BriefcaseBusiness,
  Layers,
  Network,
  Building2,
  ChartLine,
  FileText,
  LayoutGrid,
  ListChecks,
  LogOut,
  Users,
  Upload,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import { SECTIONS } from "@/features/placement/lib/types";
import { signOut } from "@/app/login/actions";

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutGrid,
  companies: Building2,
  drives: BriefcaseBusiness,
  offers: Award,
  "company-reports": FileText,
  "multiple-offers": Layers,
  departments: Network,
  batch: ChartLine,
  tests: ListChecks,
};

// Sidebar width limits in pixels at the default text size. The default
// matches the original design. The width is applied in rem, so it scales with
// the rest of the interface on large displays.
const WIDTH = { min: 200, max: 380, initial: 246, step: 16 };
const clampWidth = (w: number) =>
  Math.min(WIDTH.max, Math.max(WIDTH.min, Math.round(w)));
// How many screen pixels one design pixel currently takes.
const uiScale = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;

export function Workspace({ children, competencyTesting=false }: { children: React.ReactNode; competencyTesting?:boolean }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false),
    [theme, setTheme] = useState("light"),
    [width, setWidth] = useState(WIDTH.initial),
    [resizing, setResizing] = useState(false);
  const drag = useRef<{ x: number; w: number; scale: number } | null>(null);
  const latest = useRef(width);
  useEffect(() => {
    latest.current = width;
  }, [width]);

  // Preferences are read after mount so the server and first client render
  // agree; stored values are validated before use.
  useEffect(() => {
    try {
      setTheme(
        localStorage.getItem("dsu-placement-theme") === "dark"
          ? "dark"
          : "light",
      );
      setCollapsed(localStorage.getItem("dsu-placement-collapsed") === "true");
      const stored = Number(
        localStorage.getItem("dsu-placement-sidebar-width"),
      );
      if (Number.isFinite(stored) && stored >= WIDTH.min && stored <= WIDTH.max)
        setWidth(stored);
    } catch {}
  }, []);

  const saveWidth = (w: number) => {
    try {
      localStorage.setItem("dsu-placement-sidebar-width", String(w));
    } catch {}
  };
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

  const resizeTo = (w: number) => {
    const next = clampWidth(w);
    setWidth(next);
    saveWidth(next);
  };

  const items: {
    href: string;
    label: string;
    Icon: LucideIcon;
    current: boolean;
    className?: string;
  }[] = [
    ...(competencyTesting ? [{href:"/placement/talent-intelligence",label:"Talent intelligence",Icon:ChartLine,current:path==="/placement/talent-intelligence"}] : []),
    ...Object.entries(SECTIONS).map(([key, section]) => ({
      href: `/placement/${key}`,
      label: section.title,
      Icon: ICONS[key] ?? LayoutGrid,
      current: path === `/placement/${key}`,
    })),
    {
      href: "/placement/categories",
      label: "Student categories",
      Icon: Shapes,
      current:
        path === "/placement/categories" ||
        path.startsWith("/placement/categories/"),
    },
    {
      href: "/placement/student-analytics",
      label: "Student analytics",
      Icon: Users,
      current: path === "/placement/student-analytics",
    },
    {
      href: "/placement/imports",
      label: "Data imports",
      Icon: Upload,
      current: path === "/placement/imports",
    },
    {
      href: "/placement/assistants/friday",
      label: "F.R.I.D.A.Y.",
      Icon: Bot,
      current: path.endsWith("/friday"),
      className: "po-nav-friday",
    },
    {
      href: "/placement/student-tools",
      label: "Student tools",
      Icon: ListChecks,
      current: path === "/placement/student-tools",
    },
  ];

  return (
    <div
      className={`erp-shell po-shell po-${theme}${collapsed ? " po-collapsed" : ""}${resizing ? " po-resizing" : ""}`}
      style={{ "--po-sidebar-w": `${width / 16}rem` } as React.CSSProperties}
    >
      <a href="#placement-content" className="po-skip">
        Skip to content
      </a>
      <aside className="erp-sidebar" id="placement-sidebar">
        <Link href="/placement" className="erp-wordmark">
          DSU <span>/ PLACEMENTS</span>
        </Link>
        <p className="erp-eyebrow">PLACEMENT OFFICER</p>
        {/* Collapsing keeps every item as an icon. The label stays in the
            accessibility tree (visually hidden), and a tooltip names it. */}
        <nav aria-label="Placement Officer navigation" id="placement-nav">
          {items.map(({ href, label, Icon, current, className }) => (
            <Link
              key={href}
              href={href}
              className={className}
              aria-current={current ? "page" : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="po-nav-label">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="erp-sidebar-bottom">
          <span className="erp-role">Placement Officer</span>
          <form action={signOut}>
            <button
              className="erp-secondary po-signout"
              title={collapsed ? "Sign out" : undefined}
            >
              <LogOut size={15} aria-hidden="true" />
              <span className="po-nav-label">Sign out</span>
            </button>
          </form>
        </div>
        {!collapsed && (
          <div
            className="po-resize"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-controls="placement-sidebar"
            aria-valuemin={WIDTH.min}
            aria-valuemax={WIDTH.max}
            aria-valuenow={width}
            tabIndex={0}
            title="Drag to resize the sidebar. Double-click to reset."
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              drag.current = { x: e.clientX, w: width, scale: uiScale() };
              e.currentTarget.setPointerCapture(e.pointerId);
              setResizing(true);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d) setWidth(clampWidth(d.w + (e.clientX - d.x) / d.scale));
            }}
            onPointerUp={(e) => {
              if (!drag.current) return;
              drag.current = null;
              setResizing(false);
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
              saveWidth(latest.current);
            }}
            onPointerCancel={() => {
              drag.current = null;
              setResizing(false);
              saveWidth(latest.current);
            }}
            onDoubleClick={() => resizeTo(WIDTH.initial)}
            onKeyDown={(e) => {
              const moves: Record<string, number> = {
                ArrowLeft: width - WIDTH.step,
                ArrowRight: width + WIDTH.step,
                Home: WIDTH.min,
                End: WIDTH.max,
              };
              if (e.key in moves) {
                e.preventDefault();
                resizeTo(moves[e.key]);
              }
            }}
          />
        )}
      </aside>
      <div className="erp-workspace">
        <header className="erp-topbar po-topbar">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-controls="placement-sidebar"
            aria-expanded={!collapsed}
          >
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </button>
          <span>TRAINING & PLACEMENT CELL</span>
          <button type="button" onClick={toggleTheme}>
            Use {theme === "light" ? "dark" : "light"} theme
          </button>
        </header>
        <main
          id="placement-content"
          // The assistant lays out its own full-width bars, so its page drops
          // the standard content padding.
          className={
            path.startsWith("/placement/assistants/friday")
              ? "erp-main po-main-flush"
              : "erp-main"
          }
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
