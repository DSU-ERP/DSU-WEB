"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Library, History, Plus, Menu, X, Mic, Sun, Moon, ChevronRight } from "lucide-react";

export function InterviewShell({ children, theme, onTheme }: { children: React.ReactNode; theme: string; onTheme: () => void }) {
  const path = usePathname();
  const query = useSearchParams();
  const [open, setOpen] = useState(false);
  const view = path.includes("/report/") ? "report" : path !== "/student/interview" ? "plan" : query.get("view") || "dashboard";
  // The timed room owns its exit and finish actions, so navigation cannot
  // accidentally bypass its confirmation or obscure the interview controls.
  if (path.includes("/session/")) return <div className="iw-focus-room">{children}</div>;
  const title = { dashboard: "Overview", library: "Interviews", sessions: "Sessions", create: "New interview", report: "Interview results", plan: "Instructions & agreement" }[view] || "Overview";
  return (
    <div className="iw-app">
      <a className="st-skip" href="#interview-content">Skip to interview workspace</a>
      {open && <button className="iw-scrim" aria-label="Close interview navigation" onClick={() => setOpen(false)} />}
      <aside className={`iw-sidebar${open ? " is-open" : ""}`} aria-label="AI Interview navigation">
        <Link className="iw-brand" href="/student/interview" onClick={() => setOpen(false)}><span><Mic size={19} /></span><strong>DSU <small>Interview</small></strong></Link>
        <Link className="iw-new st-button" href="/student/interview?view=create" onClick={() => setOpen(false)}><Plus size={16} />New interview</Link>
        <p className="iw-nav-label">YOUR WORKSPACE</p>
        <nav aria-label="Interview modules">
          {[
            { label: "Overview", value: "dashboard", href: "/student/interview", Icon: LayoutDashboard },
            { label: "Interviews", value: "library", href: "/student/interview?view=library", Icon: Library },
            { label: "Sessions & reports", value: "sessions", href: "/student/interview?view=sessions", Icon: History },
          ].map(({ label, value, href, Icon }) => <Link key={value} href={href} aria-current={view === value || (value === "library" && view === "plan") || (value === "sessions" && view === "report") ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={1.6} />{label}</Link>)}
        </nav>
        <div className="iw-sidebar-note"><span className="iw-status-dot" />A space to practise.<p>Your answers, feedback and progress, together.</p></div>
        <Link className="iw-dashboard-back" href="/student/dashboard"><ArrowLeft size={16} />Back to dashboard</Link>
      </aside>
      <div className="iw-page">
        <header className="iw-topbar">
          <div><button className="iw-mobile-menu st-icon-button" aria-label="Open interview navigation" onClick={() => setOpen(true)}><Menu size={20} /></button><Link href="/student/interview">AI Interview</Link><ChevronRight size={13} /><strong>{title}</strong></div>
          <div><span className="iw-private-label">Your personal practice space</span><button className="st-icon-button" onClick={onTheme} aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>{open && <button className="iw-mobile-menu st-icon-button" aria-label="Close interview menu" onClick={() => setOpen(false)}><X size={18} /></button>}</div>
        </header>
        <main id="interview-content" className={`iw-content iw-view-${view}`} tabIndex={-1}>{children}</main>
        <footer className="iw-footer">DSU / Interview studio<span>Practise with intent. Improve with evidence.</span></footer>
      </div>
    </div>
  );
}
