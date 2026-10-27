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
  Menu,
  Moon,
  Sun,
  Users,
  Upload,
  Shapes,
<<<<<<< Updated upstream
  ChevronDown,
  PanelLeft,
  Menu,
  Moon,
  Sun,
=======
  X,
>>>>>>> Stashed changes
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

const NAV_GROUPS = [
  { id: "offers", label: "Offers & Placements", Icon: Award, routes: ["offers", "multiple-offers"] },
  { id: "departments", label: "Department Intelligence", Icon: Network, routes: ["departments", "batch", "categories", "student-analytics"] },
];
const matchesRoute = (path: string, href: string) => path === href || path.startsWith(`${href}/`);
const activeGroups = (path: string) => NAV_GROUPS.filter(group => group.routes.some(route => matchesRoute(path, `/placement/${route}`))).map(group => group.id);

export function Workspace({ children, competencyTesting=false }: { children: React.ReactNode; competencyTesting?:boolean }) {
  const path = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(() => activeGroups(path));
  useEffect(() => {
    setOpenGroups(previous => [...new Set([...previous, ...activeGroups(path)])]);
  }, [path]);
  const drawer = useRef<HTMLDialogElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeDrawer = () => { drawer.current?.close(); setMobileOpen(false); };
  useEffect(() => { drawer.current?.close(); setMobileOpen(false); }, [path]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1001px)");
    const closeOnDesktop = () => { if (media.matches) { drawer.current?.close(); setMobileOpen(false); } };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);
  const [collapsed, setCollapsed] = useState(false),
    [theme, setTheme] = useState("light"),
    [width, setWidth] = useState(WIDTH.initial),
    [resizing, setResizing] = useState(false),
    [mobileOpen, setMobileOpen] = useState(false),
    [isMobile, setIsMobile] = useState(false);
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

  // Detect mobile viewport; swap to drawer mode below 768px.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  // Prevent body scroll while mobile drawer is open.
  useEffect(() => {
    const html = document.documentElement;
    if (mobileOpen) html.classList.add("po-nav-open");
    else html.classList.remove("po-nav-open");
    return () => html.classList.remove("po-nav-open");
  }, [mobileOpen]);

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
    if (isMobile) {
      setMobileOpen((o) => !o);
      return;
    }
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("dsu-placement-collapsed", String(next));
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
      current: matchesRoute(path, `/placement/${key}`),
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

  const navigation = (mobile = false) => {
    const link = (route: string) => {
      const item = items.find(item => item.href === `/placement/${route}`);
      if (!item) return null;
      const { href, Icon, current, className } = item;
      const label = route === "departments" ? "Department Intelligence Overview" : item.label;
      return <Link key={href} href={href} className={className} aria-current={current ? "page" : undefined}
        title={!mobile && collapsed ? label : undefined} onClick={mobile ? closeDrawer : undefined}>
        <Icon size={16} aria-hidden="true"/><span className="po-nav-label">{label}</span>
      </Link>;
    };
    return <nav id={mobile ? "placement-mobile-nav" : "placement-nav"} aria-label={mobile ? "Mobile Placement Officer navigation" : "Placement Officer navigation"}>
      {["assistants/friday", "overview", "companies", "drives"].map(link)}
      {NAV_GROUPS.map(({id, label, Icon, routes}) => {
        const open = openGroups.includes(id);
        const controls = `po-${mobile ? "mobile" : "desktop"}-${id}-links`;
        return <div className="po-nav-group" key={id} data-active={routes.some(route => matchesRoute(path, `/placement/${route}`)) || undefined}>
          <button type="button" className="po-nav-toggle" aria-expanded={open} aria-controls={controls}
            title={!mobile && collapsed ? label : undefined}
            onClick={() => setOpenGroups(previous => open ? previous.filter(value => value !== id) : [...previous, id])}>
            <Icon size={16} aria-hidden="true"/><span className="po-nav-label">{label}</span><ChevronDown className="po-nav-chevron" size={13} aria-hidden="true"/>
          </button>
          <div id={controls} className="po-nav-children" hidden={!open}>{routes.map(link)}</div>
        </div>;
      })}
      {["company-reports", "tests", "imports", "student-tools", "talent-intelligence"].map(link)}
    </nav>;
  };
  return (
    <div
      className={`erp-shell po-shell po-${theme}${collapsed && !isMobile ? " po-collapsed" : ""}${resizing ? " po-resizing" : ""}${mobileOpen ? " po-mobile-open" : ""}`}
      style={{ "--po-sidebar-w": `${width / 16}rem` } as React.CSSProperties}
    >
      <a href="#placement-content" className="po-skip">
        Skip to content
      </a>
      {/* Mobile drawer backdrop */}
      <div
        className="po-mobile-backdrop"
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside className="erp-sidebar" id="placement-sidebar">
        <Link href="/placement" className="erp-wordmark">
          DSU <span>/ PLACEMENTS</span>
        </Link>
        <p className="erp-eyebrow">PLACEMENT OFFICER</p>
        {/* Collapsing keeps every item as an icon. The label stays in the
            accessibility tree (visually hidden), and a tooltip names it. */}
<<<<<<< Updated upstream
        {navigation()}
=======
        <nav aria-label="Placement Officer navigation" id="placement-nav">
          {items.map(({ href, label, Icon, current, className }) => (
            <Link
              key={href}
              href={href}
              className={className}
              aria-current={current ? "page" : undefined}
              title={collapsed && !isMobile ? label : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="po-nav-label">{label}</span>
            </Link>
          ))}
        </nav>
>>>>>>> Stashed changes
        <div className="erp-sidebar-bottom">
          <span className="erp-role">Placement Officer</span>
          <form action={signOut}>
            <button
              className="erp-secondary po-signout"
              title={collapsed && !isMobile ? "Sign out" : undefined}
            >
              <LogOut size={15} aria-hidden="true" />
              <span className="po-nav-label">Sign out</span>
            </button>
          </form>
        </div>
        {!collapsed && !isMobile && (
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
      <dialog className="po-mobile-drawer" ref={drawer} aria-labelledby="po-drawer-title" onClose={()=>setMobileOpen(false)} onClick={e=>{if(e.target===e.currentTarget)closeDrawer();}}>
        <div className="po-drawer-heading"><strong id="po-drawer-title">DSU / Placements</strong><button type="button" className="erp-secondary" onClick={closeDrawer}>Close menu</button></div>
        {navigation(true)}
        <div className="po-drawer-account"><span className="erp-role">Placement Officer</span><form action={signOut}><button className="erp-secondary po-signout"><LogOut size={16} aria-hidden="true"/>Sign out</button></form></div>
      </dialog>
      <div className="erp-workspace">
        <header className="erp-topbar po-topbar">
          <button
            type="button"
<<<<<<< Updated upstream
            className="po-desktop-nav-toggle"
=======
            className="po-topbar-nav-btn"
>>>>>>> Stashed changes
            onClick={toggleSidebar}
            aria-controls="placement-sidebar"
            aria-expanded={isMobile ? mobileOpen : !collapsed}
            aria-label={
              isMobile
                ? mobileOpen ? "Close navigation" : "Open navigation"
                : collapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
<<<<<<< Updated upstream
            <PanelLeft size={17} aria-hidden="true"/>{collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </button>
          <button type="button" className="po-mobile-nav-toggle" aria-haspopup="dialog" aria-expanded={mobileOpen} onClick={()=>{drawer.current?.showModal();setMobileOpen(true);}}><Menu size={17} aria-hidden="true"/>Menu</button>
          <span className="po-topbar-identity">TRAINING & PLACEMENT CELL</span>
          <button type="button" onClick={toggleTheme}>
            {theme === "light" ? <Moon size={16} aria-hidden="true"/> : <Sun size={16} aria-hidden="true"/>}Use {theme === "light" ? "dark" : "light"} theme
=======
            {isMobile ? (
              mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />
            ) : (
              collapsed ? "Expand sidebar" : "Collapse sidebar"
            )}
          </button>
          <span>TRAINING & PLACEMENT CELL</span>
          <button
            type="button"
            className="po-topbar-theme-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          >
            {theme === "light"
              ? <><Moon size={14} aria-hidden="true" /><span className="po-topbar-theme-label">Dark</span></>
              : <><Sun size={14} aria-hidden="true" /><span className="po-topbar-theme-label">Light</span></>
            }
>>>>>>> Stashed changes
          </button>
        </header>
        <main
          id="placement-content"
          // The assistant lays out its own full-width bars, so its page drops
          // the standard content padding.
          className={
            path.startsWith("/placement/assistants/friday")
              ? "erp-main po-main-flush"
              : path === "/placement/overview" ? "erp-main po-overview-main" : "erp-main"
          }
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
