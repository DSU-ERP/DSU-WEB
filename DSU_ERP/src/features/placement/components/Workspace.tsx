"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Award,
  BriefcaseBusiness,
  Building2,
  ChartLine,
  House,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  Sun,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { activeNav, placementNav } from "@/features/placement/lib/nav";
import { signOut } from "@/app/login/actions";
import { NotificationBell } from "@/shared/notifications/Notifications";

const ICONS: Record<string, LucideIcon> = {
  home: House,
  drives: BriefcaseBusiness,
  companies: Building2,
  students: Users,
  offers: Award,
  insights: ChartLine,
  tools: Wrench,
};

const WIDTH = { min: 200, max: 380, initial: 246, step: 16 };
const clampWidth = (w: number) =>
  Math.min(WIDTH.max, Math.max(WIDTH.min, Math.round(w)));
const uiScale = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;

export function Workspace({ children, competencyTesting = false }: { children: React.ReactNode; competencyTesting?: boolean }) {
  const path = usePathname();
  const sections = placementNav(competencyTesting);
  const active = activeNav(path, sections);
  const onFriday = path.startsWith("/placement/assistants/friday");

  const drawer = useRef<HTMLDialogElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeDrawer = () => { drawer.current?.close(); setMobileOpen(false); };

  // Close mobile drawer on route change.
  useEffect(() => { drawer.current?.close(); setMobileOpen(false); }, [path]);

  // Close drawer when viewport grows to desktop width.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (media.matches) { drawer.current?.close(); setMobileOpen(false); } };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  const [collapsed, setCollapsed] = useState(false),
    [theme, setTheme] = useState("light"),
    [width, setWidth] = useState(WIDTH.initial),
    [resizing, setResizing] = useState(false),
    [isMobile, setIsMobile] = useState(false);

  const drag = useRef<{ x: number; w: number; scale: number } | null>(null);
  const latest = useRef(width);
  useEffect(() => { latest.current = width; }, [width]);

  // Preferences are read after mount so the server and first client render
  // agree; stored values are validated before use.
  useEffect(() => {
    try {
      setTheme(
        localStorage.getItem("dsu-placement-theme") === "dark" ? "dark" : "light",
      );
      setCollapsed(localStorage.getItem("dsu-placement-collapsed") === "true");
      const stored = Number(localStorage.getItem("dsu-placement-sidebar-width"));
      if (Number.isFinite(stored) && stored >= WIDTH.min && stored <= WIDTH.max)
        setWidth(stored);
    } catch {}
  }, []);

  // Track whether we are in mobile/tablet drawer mode (< 1024px).
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


  const saveWidth = (w: number) => {
    try { localStorage.setItem("dsu-placement-sidebar-width", String(w)); } catch {}
  };
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try { localStorage.setItem("dsu-placement-theme", next); } catch {}
  };
  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((o) => !o);
      return;
    }
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("dsu-placement-collapsed", String(next)); } catch {}
  };

  const resizeTo = (w: number) => {
    const next = clampWidth(w);
    setWidth(next);
    saveWidth(next);
  };

  const navigation = (mobile = false) => (
    <nav
      id={mobile ? "placement-mobile-nav" : "placement-nav"}
      aria-label={mobile ? "Mobile Placement Officer navigation" : "Placement Officer navigation"}
    >
      {sections.map(({ id, label, href }) => {
        const Icon = ICONS[id] ?? House;
        const current = active.section?.id === id;
        return (
          <Link key={id} href={href}
            className={id === "tools" ? "po-nav-tools" : undefined}
            aria-current={current ? "page" : undefined}
            title={!mobile && collapsed && !isMobile ? label : undefined}
            onClick={mobile ? closeDrawer : undefined}
          >
            <Icon size={16} aria-hidden="true" /><span className="po-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
  const tabs = !onFriday && active.section && active.section.tabs.length > 1 ? active.section : null;

  return (
    <div
      className={`erp-shell po-shell po-${theme}${collapsed && !isMobile ? " po-collapsed" : ""}${resizing ? " po-resizing" : ""}${mobileOpen ? " po-mobile-open" : ""}`}
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
        {navigation()}
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
      {/* Mobile/tablet overlay drawer (dialog) */}
      <dialog
        className="po-mobile-drawer"
        ref={drawer}
        aria-labelledby="po-drawer-title"
        onClose={() => setMobileOpen(false)}
        onClick={(e) => { if (e.target === e.currentTarget) closeDrawer(); }}
      >
        <div className="po-drawer-heading">
          <strong id="po-drawer-title">DSU / Placements</strong>
          <button type="button" className="erp-secondary" onClick={closeDrawer}>
            <X size={15} aria-hidden="true" />Close
          </button>
        </div>
        {navigation(true)}
        <div className="po-drawer-account">
          <span className="erp-role">Placement Officer</span>
          <form action={signOut}>
            <button className="erp-secondary po-signout">
              <LogOut size={16} aria-hidden="true" />Sign out
            </button>
          </form>
        </div>
      </dialog>
      <div className="erp-workspace">
        <header className="erp-topbar po-topbar">
          {/* Desktop: toggle sidebar collapse */}
          <button
            type="button"
            className="po-desktop-nav-toggle"
            onClick={toggleSidebar}
            aria-controls="placement-sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft size={17} aria-hidden="true" />
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </button>
          {/* Mobile/tablet: open overlay drawer */}
          <button
            type="button"
            className="po-mobile-nav-toggle"
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
            aria-controls="placement-mobile-nav"
            onClick={() => { drawer.current?.showModal(); setMobileOpen(true); }}
          >
            <Menu size={17} aria-hidden="true" />Menu
          </button>
          <span className="po-topbar-identity">TRAINING & PLACEMENT CELL</span>
          <Link
            href="/placement/assistants/friday"
            className="po-topbar-friday"
            aria-current={onFriday ? "page" : undefined}
          >
            <Bot size={15} aria-hidden="true" />F.R.I.D.A.Y.
          </Link>
          <NotificationBell className="po-topbar-bell" />
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
          </button>
        </header>
        <main
          id="placement-content"
          className={
            onFriday
              ? "erp-main po-main-flush"
              : active.section?.id === "home" || path === "/placement/insights" ? "erp-main po-overview-main" : "erp-main"
          }
          tabIndex={-1}
        >
          {/* Keyed by path so each page plays the entrance transition. */}
          {tabs && (
            <nav className="po-section-tabs" aria-label={`${tabs.label} pages`}>
              {tabs.tabs.map((tab) => (
                <Link key={tab.href} href={tab.href} aria-current={active.tab?.href === tab.href ? "page" : undefined}>
                  {tab.label}
                </Link>
              ))}
            </nav>
          )}
          <div className="po-route" key={path}>{children}</div>
        </main>
      </div>
    </div>
  );
}
