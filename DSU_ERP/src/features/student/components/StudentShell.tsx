"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  MessageSquare,
  Mic,
  Sparkles,
  ClipboardCheck,
  LockKeyhole,
  FileText,
  BriefcaseBusiness,
  CalendarDays,
  Settings,
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  X,
  PanelLeftClose,
  CodeXml,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { STUDENT_MODULES, type Notice } from "../lib/types";
import { studentFetch } from "../lib/client";
import { InterviewShell } from "./InterviewShell";
const icons = {
  dashboard: LayoutDashboard,
  chart: ChartNoAxesCombined,
  chat: MessageSquare,
  mic: Mic,
  spark: Sparkles,
  check: ClipboardCheck,
  lock: LockKeyhole,
  file: FileText,
  briefcase: BriefcaseBusiness,
  calendar: CalendarDays,
  settings: Settings,
  skills: CodeXml,
};
export function StudentShell({
  name,
  usn,
  children,
  mode = "full",
  competencyTesting = false,
}: {
  name: string;
  usn: string;
  children: React.ReactNode;
  // "onboarding": skills onboarding is still required, so only the
  // onboarding flow is reachable and no workspace navigation is shown.
  mode?: "full" | "onboarding";
  competencyTesting?: boolean;
}) {
  const path = usePathname();
  const [theme, setTheme] = useState("light"),
    [drawer, setDrawer] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [term, setTerm] = useState(""),
    [notices, setNotices] = useState<Notice[]>([]),
    [noticeLoading, setNoticeLoading] = useState(false),
    [noticeError, setNoticeError] = useState("");
  const command = useRef<HTMLDialogElement>(null);
  const modules = [...STUDENT_MODULES, ...(competencyTesting ? [{href:"/student/career-intelligence",label:"Career intelligence",purpose:"Evidence and career development",group:"Workspace",icon:"chart" as const}] : [])];
  const current = [...modules]
    .reverse()
    .find((item) => path.startsWith(item.href));
  useEffect(() => {
    try {
      setTheme(localStorage.getItem("dsu-student-theme") || "light");
      setCollapsed(localStorage.getItem("dsu-student-collapsed") === "true");
    } catch {}
  }, []);
  useEffect(() => {
    setDrawer(false);
    command.current?.close();
  }, [path]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        command.current?.showModal();
      }
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const changeTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("dsu-student-theme", next);
    } catch {}
  };
  const toggleNav = () => {
    setCollapsed(!collapsed);
    try {
      localStorage.setItem("dsu-student-collapsed", String(!collapsed));
    } catch {}
  };
  const loadNotices = async () => {
    setNoticeLoading(true);
    try {
      setNotices(await studentFetch<Notice[]>("notifications"));
      setNoticeError("");
    } catch (error) {
      setNoticeError((error as Error).message);
    } finally {
      setNoticeLoading(false);
    }
  };
  const focus = /\/test$|\/session\//.test(path);
  if (mode === "onboarding") {
    return (
      <div className={`st-app st-calm-shell st-${theme} st-si-frame`}>
        <a className="st-skip" href="#student-content">
          Skip to content
        </a>
        <header className="st-si-frame-bar">
          <span className="st-brand">
            <span className="st-brand-mark">
              D<span />
            </span>
            <span>
              DSU <small>/ STUDENT</small>
            </span>
          </span>
          <div className="st-si-frame-actions">
            <span className="st-si-frame-name">
              <strong>{name}</strong>
              <small>{usn}</small>
            </span>
            <button
              className="st-icon-button"
              onClick={changeTheme}
              aria-label={theme === "light" ? "Use dark theme" : "Use light theme"}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <form action={signOut}>
              <button className="st-button st-button-secondary">Sign out</button>
            </form>
          </div>
        </header>
        <main id="student-content" className="st-si-frame-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }
  if (path === "/student/interview" || path.startsWith("/student/interview/")) {
    return <div className={`st-app st-${theme} st-interview-app`}><InterviewShell theme={theme} onTheme={changeTheme}>{children}</InterviewShell></div>;
  }
  // F.R.I.D.A.Y. is its own workspace. Keep the authenticated student layout and
  // theme, while rendering none of the dashboard navigation or page frame.
  if (path === "/student/friday") {
    return (
      <div className={`st-app st-${theme} st-standalone`}>
        <main id="student-content" className="st-standalone-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }
  return (
    <div
      className={`st-app st-calm-shell st-${theme}${collapsed ? " st-collapsed" : ""}${focus ? " st-focused" : ""}`}
    >
      <a className="st-skip" href="#student-content">
        Skip to content
      </a>
      {drawer && (
        <button
          className="st-scrim"
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        className={`st-sidebar${drawer ? " st-drawer-open" : ""}`}
        aria-label="Student workspace navigation"
      >
        <Link className="st-brand" href="/student/dashboard">
          <span className="st-brand-mark">
            D<span />
          </span>
          <span>
            DSU <small>/ STUDENT</small>
          </span>
        </Link>
        <nav aria-label="Student modules" tabIndex={0}>
          {["Workspace", "Placement kit", "Campus", "Account"].map((group) => (
            <div className="st-nav-group" key={group}>
              <p>{group}</p>
              {modules.filter((item) => item.group === group).map(
                (item) => {
                  const Icon = icons[item.icon];
                  const active = current?.href === item.href;
                  return (
                    <Link
                      title={item.label}
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setDrawer(false)}
                    >
                      <Icon size={18} strokeWidth={1.6} />
                      <span>{item.label}</span>
                    </Link>
                  );
                },
              )}
            </div>
          ))}
        </nav>
        <div className="st-sidebar-footer">
          <div className="st-identity">
          <span className="st-avatar">
            {name
              .split(" ")
              .map((word) => word[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <strong>{name}</strong>
            <small>{usn}</small>
          </div>
        </div>
          <button
            onClick={toggleNav}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      </aside>
      <div className="st-page">
        <header className="st-topbar">
          <div className="st-breadcrumb">
            <button
              className="st-mobile-menu st-icon-button"
              aria-label="Open navigation"
              onClick={() => setDrawer(true)}
            >
              <Menu size={20} />
            </button>
            <button
              className="st-icon-button st-desktop-nav"
              onClick={toggleNav}
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
            >
              <PanelLeftClose size={18} />
            </button>
            <strong>{current?.label || "Your workspace"}</strong>
          </div>
          <div className="st-top-actions">
            <button
              className="st-search-trigger"
              onClick={() => command.current?.showModal()}
              aria-label="Search modules"
            >
              <Search size={16} />
              <span>Search workspace</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="st-icon-button"
              onClick={changeTheme}
              aria-label={
                theme === "light" ? "Use dark theme" : "Use light theme"
              }
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <details
              className="st-notifications"
              onToggle={(e) => {
                if (e.currentTarget.open) void loadNotices();
              }}
            >
              <summary aria-label="Notifications">
                <Bell size={18} />
              </summary>
              <div className="st-popover">
                <h3>Notifications</h3>
                {notices.some((n) => !n.read_at) && (
                  <button
                    className="st-button st-button-secondary"
                    onClick={async () => {
                      try {
                        await studentFetch("notifications/read", {
                          method: "POST",
                          body: {},
                        });
                        await loadNotices();
                      } catch (e) {
                        setNoticeError((e as Error).message);
                      }
                    }}
                  >
                    Mark all as read
                  </button>
                )}
                {noticeLoading ? (
                  <p role="status">Loading your updates…</p>
                ) : noticeError ? (
                  <p role="alert">{noticeError}</p>
                ) : notices.length ? (
                  notices.map((item) => (
                    <article key={item.id}>
                      {item.href ? (
                        <Link href={item.href}>{item.title}</Link>
                      ) : (
                        <strong>{item.title}</strong>
                      )}
                      <p>{item.body}</p>
                      <small>
                        {new Date(item.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}
                      </small>
                    </article>
                  ))
                ) : (
                  <p>
                    You’re all caught up. New campus updates will appear here.
                  </p>
                )}
              </div>
            </details>
            <details className="st-account">
              <summary aria-label="Account menu">
                <span className="st-avatar st-avatar-small">
                  {name.slice(0, 1)}
                </span>
              </summary>
              <div className="st-popover">
                <strong>{name}</strong>
                <p>{usn}</p>
                <Link href="/student/settings">Manage profile ↗</Link>
                <form action={signOut}>
                  <button>Sign out</button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <main id="student-content" className="st-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="st-footer">
          <span>DAYANANDA SAGAR UNIVERSITY</span>
          <span>Your ambition. Your next chapter.</span>
        </footer>
      </div>
      <dialog
        className="st-command"
        ref={command}
        onClick={(e) => {
          if (e.target === command.current) command.current.close();
        }}
        aria-label="Find a module"
      >
        <div className="st-command-search">
          <Search size={20} />
          <input
            autoFocus
            placeholder="Where would you like to go?"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Find modules"
          />
          <button
            className="st-icon-button"
            aria-label="Close search"
            onClick={() => command.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <div className="st-command-results">
          {modules.filter((item) =>
            `${item.label} ${item.purpose}`
              .toLowerCase()
              .includes(term.toLowerCase()),
          ).map((item) => {
            const Icon = icons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => command.current?.close()}
              >
                <Icon size={20} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.purpose}</small>
                </span>
                <span>↗</span>
              </Link>
            );
          })}
          {!modules.some((item) =>
            `${item.label} ${item.purpose}`
              .toLowerCase()
              .includes(term.toLowerCase()),
          ) && <p className="st-empty">No matching action.</p>}
        </div>
      </dialog>
    </div>
  );
}
