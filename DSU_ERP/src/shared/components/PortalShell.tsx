"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BriefcaseBusiness,
  FilePlus2,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  Sun,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { NotificationBell } from "@/shared/notifications/Notifications";

const ICONS = { dashboard: LayoutGrid, drives: BriefcaseBusiness, submit: FilePlus2, friday: Bot, workflow: Workflow } satisfies Record<string, LucideIcon>;
export type PortalNavItem = { href: string; label: string; icon: keyof typeof ICONS; match: "exact" | "prefix"; friday?: boolean; also?: string[] };

/**
 * Sidebar, mobile drawer and top bar shared by the company and admin portals,
 * in the placement workspace's visual system (light and dark).
 */
export function PortalShell({
  wordmark,
  heading,
  member,
  identity,
  themeKey,
  nav,
  bell = true,
  flush = [],
  children,
}: {
  wordmark: string;
  heading: string;
  member: string;
  identity: string;
  themeKey: string;
  nav: PortalNavItem[];
  bell?: boolean;
  flush?: string[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const [theme, setTheme] = useState("light");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    try {
      setTheme(localStorage.getItem(`${themeKey}-theme`) === "dark" ? "dark" : "light");
      setCollapsed(localStorage.getItem(`${themeKey}-collapsed`) === "true");
    } catch {}
  }, [themeKey]);
  useEffect(() => {
    drawer.current?.close();
    setMobileOpen(false);
  }, [path]);
  const remember = (key: string, value: string) => {
    try {
      localStorage.setItem(`${themeKey}-${key}`, value);
    } catch {}
  };
  const active = (item: PortalNavItem) =>
    (item.match === "exact" ? path === item.href : path === item.href || path.startsWith(`${item.href}/`)) ||
    (item.also || []).some((prefix) => path.startsWith(prefix));
  const links = (mobile = false) => (
    <nav aria-label={mobile ? `Mobile ${heading} navigation` : `${heading} navigation`} id={mobile ? "portal-mobile-nav" : "portal-nav"}>
      {nav.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item) ? "page" : undefined}
            title={!mobile && collapsed ? item.label : undefined}
            className={item.friday ? "po-nav-friday" : undefined}
            onClick={mobile ? () => drawer.current?.close() : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="po-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className={`erp-shell po-shell co-shell po-${theme}${collapsed ? " po-collapsed" : ""}${mobileOpen ? " po-mobile-open" : ""}`}>
      <a href="#portal-content" className="po-skip">
        Skip to content
      </a>
      <aside className="erp-sidebar" id="portal-sidebar">
        <Link href={nav[0]?.href || "/"} className="erp-wordmark">
          DSU <span>/ {wordmark}</span>
        </Link>
        <p className="co-company" title={heading}>
          {heading}
        </p>
        {links()}
        <div className="erp-sidebar-bottom">
          <span className="erp-role" title={member}>
            {member}
          </span>
          <form action={signOut}>
            <button className="erp-secondary po-signout" title={collapsed ? "Sign out" : undefined}>
              <LogOut size={15} aria-hidden="true" />
              <span className="po-nav-label">Sign out</span>
            </button>
          </form>
        </div>
      </aside>
      <dialog
        className="po-mobile-drawer"
        ref={drawer}
        aria-labelledby="portal-drawer-title"
        onClose={() => setMobileOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) drawer.current?.close();
        }}
      >
        <div className="po-drawer-heading">
          <strong id="portal-drawer-title">{heading}</strong>
          <button type="button" className="erp-secondary" onClick={() => drawer.current?.close()}>
            <X size={15} aria-hidden="true" />
            Close
          </button>
        </div>
        {links(true)}
        <div className="po-drawer-account">
          <span className="erp-role">{member}</span>
          <form action={signOut}>
            <button className="erp-secondary po-signout">
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </dialog>
      <div className="erp-workspace">
        <header className="erp-topbar po-topbar">
          <button
            type="button"
            className="po-desktop-nav-toggle"
            onClick={() => {
              setCollapsed(!collapsed);
              remember("collapsed", String(!collapsed));
            }}
            aria-controls="portal-sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft size={17} aria-hidden="true" />
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </button>
          <button
            type="button"
            className="po-mobile-nav-toggle"
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
            aria-controls="portal-mobile-nav"
            onClick={() => {
              drawer.current?.showModal();
              setMobileOpen(true);
            }}
          >
            <Menu size={17} aria-hidden="true" />
            Menu
          </button>
          <span className="po-topbar-identity">{identity}</span>
          {bell ? <NotificationBell className="po-topbar-bell" /> : <span className="po-topbar-bell" />}
          <button
            type="button"
            className="po-topbar-theme-btn"
            onClick={() => {
              const next = theme === "light" ? "dark" : "light";
              setTheme(next);
              remember("theme", next);
            }}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          >
            {theme === "light" ? (
              <>
                <Moon size={14} aria-hidden="true" />
                <span className="po-topbar-theme-label">Dark</span>
              </>
            ) : (
              <>
                <Sun size={14} aria-hidden="true" />
                <span className="po-topbar-theme-label">Light</span>
              </>
            )}
          </button>
        </header>
        <main id="portal-content" className={flush.some((p) => path.startsWith(p)) ? "erp-main po-main-flush" : "erp-main"} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
