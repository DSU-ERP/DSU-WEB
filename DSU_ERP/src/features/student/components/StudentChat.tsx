"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Search,
  Trash2,
  Mic,
  FileSearch,
  X,
  Paperclip,
  Globe,
  RotateCcw,
  BriefcaseBusiness,
  ArrowUp,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Compass,
  Copy,
  Eye,
  FileText,
  LoaderCircle,
  MessageSquare,
  MicOff,
  ShieldCheck,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Settings2,
} from "lucide-react";
import { studentFetch } from "../lib/client";
import { useSpeechInput } from "../lib/useSpeech";
import { DocumentUpload, type UploadedDocument } from "./DocumentUpload";
import { ErrorNote } from "./UI";
import { RichText } from "./RichText";
import { groupFridayHistory } from "../lib/friday-history";
import type { Opportunity } from "./Placement";
type CareerCard = {
  type: string;
  title: string;
  summary: string;
  score: number | null;
  items: { label: string; description: string; status: string }[];
  actions: string[];
};
type Source = { title: string; url: string; description: string; domain?: string };
type ResearchInfo = { query: string; resultCount: number; results: Source[] };
type Research = "off" | "used" | "no-results" | "failed" | "unavailable" | "skipped";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  card: CareerCard | null;
  sources?: Source[];
  research?: Research;
  researchInfo?: ResearchInfo;
  animate?: boolean;
  needsResume?: boolean;
  // Optimistic user messages: shown at once, marked when they could not be sent.
  status?: "sending" | "failed";
  error?: string;
};
type Conversation = { id: string; title: string; updated_at: string };
type DriveContext = {
  id: string;
  company: string;
  title: string;
  eligibility?: Opportunity["eligibility"];
};
const COMPARE_PROMPT = "Compare my profile with this JD";
const RESUME_LIMIT = 60000;
const SIDEBAR_WIDTH_KEY = "dsu-friday-sidebar-width";
const SEARCH_PREFERENCE_KEY = "dsu-friday-web-search";
const savedSearchPreference = () => { try { return localStorage.getItem(SEARCH_PREFERENCE_KEY) === "true"; } catch { return false; } };
const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 420;
const STARTERS = [
  { title: "Find my direction", description: "Turn your interests into a career plan", prompt: "Help me choose my next preparation step.", icon: Compass },
  { title: "Strengthen my resume", description: "Make your experience count", prompt: "What evidence would strengthen my resume?", icon: FileText },
  { title: "Prepare for interviews", description: "Practise one answer at a time", prompt: "Help me practise a placement interview. Ask one question at a time and coach my answer.", icon: MessageSquare },
  { title: "Build a skill roadmap", description: "A practical path to your target role", prompt: "Build a practical skill roadmap for my target role.", icon: Target },
];
type ServiceState = { state: "checking" | "ready" | "unavailable" | "unconfigured"; researchReady?: boolean; message?: string };
const REQUIREMENT_TONE: Record<string, string> = {
  strong: "good",
  partial: "neutral",
  weak: "warn",
  missing: "bad",
  unclear: "neutral",
};
const RESEARCH_NOTE: Partial<Record<Research, string>> = {
  unavailable:
    "Web search is not configured on campus services, so this answer uses no live sources.",
  "no-results": "Web search found no results, so this answer uses no live sources.",
  failed: "Web search did not respond, so this answer uses no live sources.",
};
const domainOf = (url: string) => {
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) ? parsed.hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};
function CardView({ card, onAction }: { card: CareerCard; onAction: (text: string) => void }) {
  const jd = card.type === "jd-match";
  return (
    <section className="st-career-card">
      <span className="st-tag">
        {jd ? "JD match" : card.type} · AI guidance
      </span>
      <h3>{card.title}</h3>
      <p className="st-muted">{card.summary}</p>
      {card.score !== null && (
        <p className="st-muted">
          Advisory estimate: {card.score}/100{jd ? " · not an eligibility or hiring decision" : ""}
        </p>
      )}
      {jd && (
        <p className="st-jd-legend" aria-label="Status meanings">
          Strong: clear evidence · Partial: related evidence · Weak: indirect · Missing: no evidence ·
          Unclear: too vague to judge
        </p>
      )}
      {card.items.map((finding, index) => (
        <div className="st-list-row" key={index}>
          <div>
            <strong>{finding.label}</strong>
            <p>{finding.description}</p>
          </div>
          {jd ? (
            <span className={`st-chip st-chip-${REQUIREMENT_TONE[finding.status] || "neutral"}`}>
              {finding.status}
            </span>
          ) : (
            <span className="st-tag">{finding.status}</span>
          )}
        </div>
      ))}
      {!!card.actions.length && (
        <div className="st-actions">
          {card.actions.map((action) => (
            <button key={action} className="st-button st-button-secondary" onClick={() => onAction(action)}>
              {action}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
function Sources({ sources, label = "Sources" }: { sources: Source[]; label?: string }) {
  const safe = sources.filter((source) => domainOf(source.url));
  if (!safe.length) return null;
  return (
    <section className="st-sources" aria-label={label}>
      <p className="st-eyebrow">{label}</p>
      <ol>
        {safe.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noopener noreferrer nofollow">
              <span>{source.domain || domainOf(source.url)}</span>
              {source.title} ↗
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
export function StudentFridayChat({
  initial,
  driveId,
  prompt,
  initialError,
}: {
  initial: Conversation[];
  driveId?: string;
  prompt?: string;
  initialError?: string;
}) {
  const [history, setHistory] = useState(initial),
    [conversation, setConversation] = useState<string | null>(null),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    // A ?prompt= link only fills the composer; the student decides to send it.
    [message, setMessage] = useState(prompt || ""),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError || ""),
    [opening, setOpening] = useState(false),
    [service, setService] = useState<ServiceState>({ state: "checking" }),
    [copied, setCopied] = useState<string | null>(null),
    [historyOpen, setHistoryOpen] = useState(false),
    [sidebarCollapsed, setSidebarCollapsed] = useState(false),
    [sidebarWidth, setSidebarWidth] = useState(264),
    [sidebarLimit, setSidebarLimit] = useState(SIDEBAR_MAX),
    [resizingSidebar, setResizingSidebar] = useState(false),
    [attachmentOpen, setAttachmentOpen] = useState(false),
    [attachment, setAttachment] = useState<UploadedDocument | null>(null),
    [resume, setResume] = useState(""),
    [jd, setJd] = useState(""),
    [drive, setDrive] = useState<DriveContext | null>(null),
    [driveGone, setDriveGone] = useState(false),
    [webSearch, setWebSearch] = useState(false);
  // The message endpoint accepts at most 60,000 characters of resume text.
  const takeResume = (text: string) => setResume(text.slice(0, RESUME_LIMIT));
  const review = useRef<HTMLDialogElement>(null),
    historyDialog = useRef<HTMLDialogElement>(null),
    mainSidebarToggle = useRef<HTMLButtonElement>(null),
    sidebarClose = useRef<HTMLButtonElement>(null),
    sidebarDrag = useRef<{ x: number; width: number; value: number } | null>(null),
    end = useRef<HTMLDivElement>(null),
    composer = useRef<HTMLTextAreaElement>(null),
    messageList = useRef<HTMLDivElement>(null),
    followConversation = useRef(true),
    sending = useRef(false),
    loadRequest = useRef<AbortController | null>(null);
  const speech = useSpeechInput(setMessage);
  const chooseWebSearch = (enabled: boolean) => {
    setWebSearch(enabled);
    try { localStorage.setItem(SEARCH_PREFERENCE_KEY, String(enabled)); } catch { /* The current choice still works. */ }
  };
  const turn = useRef(0);
  const visibleSidebarWidth = Math.min(sidebarWidth, sidebarLimit);
  const resizeSidebar = (value: number, remember = false) => {
    const next = Math.round(Math.max(SIDEBAR_MIN, Math.min(sidebarLimit, value)));
    setSidebarWidth(next);
    if (remember) { try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next)); } catch { /* Resizing still works when storage is unavailable. */ } }
    return next;
  };
  useEffect(() => {
    setWebSearch(savedSearchPreference());
    try {
      const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      if (Number.isFinite(saved) && saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX) setSidebarWidth(saved);
    } catch { /* Use the default width. */ }
    const measure = () => setSidebarLimit(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, window.innerWidth - 520)));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const checkService = async () => {
    setService({ state: "checking" });
    try {
      const status = await studentFetch<{ chatReady: boolean; researchReady: boolean }>("assistant/status");
      if (typeof status.chatReady !== "boolean") return;
      setService({ state: status.chatReady ? "ready" : "unconfigured", researchReady: status.researchReady });
    } catch (e) {
      setService({ state: "unavailable", message: (e as Error).message });
    }
  };
  useEffect(() => {
    void checkService();
    return () => { turn.current++; loadRequest.current?.abort(); };
  }, []);
  useEffect(() => {
    const dialog = historyDialog.current;
    if (historyOpen && !dialog?.open) dialog?.showModal();
    if (!historyOpen && dialog?.open) dialog.close();
  }, [historyOpen]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const closeMobile = () => { if (desktop.matches) setHistoryOpen(false); };
    desktop.addEventListener("change", closeMobile);
    return () => desktop.removeEventListener("change", closeMobile);
  }, []);
  useLayoutEffect(() => {
    const list = messageList.current;
    if (!list) return;
    if (!messages.length) { list.scrollTop = 0; followConversation.current = true; return; }
    if (!followConversation.current) return;
    const latest = list.querySelector<HTMLElement>(".st-chat-assistant:last-of-type");
    if (!busy && messages.at(-1)?.role === "assistant" && latest)
      list.scrollTop += latest.getBoundingClientRect().top - list.getBoundingClientRect().top - 24;
    else list.scrollTop = list.scrollHeight;
  }, [messages, busy]);
  const usePrompt = (value: string) => { setMessage(value); composer.current?.focus(); };
  const copyMessage = async (item: ChatMessage) => {
    try { await navigator.clipboard.writeText(item.content); setCopied(item.id); }
    catch { setError("Copy is unavailable in this browser. You can select the answer text instead."); }
  };
  useEffect(() => {
    if (!driveId) return;
    // Opened from a drive: prepare the comparison and wait for the student to send.
    // A late answer must not replace a conversation the student opened meanwhile.
    let cancelled = false;
    const token = ++turn.current;
    void studentFetch<Opportunity>(`opportunities/${encodeURIComponent(driveId)}`)
      .then((opportunity) => {
        if (cancelled || token !== turn.current) return;
        turn.current++;
        setBusy(false);
        setDriveGone(false);
        setDrive({
          id: opportunity.id,
          company: opportunity.company,
          title: opportunity.title,
          eligibility: opportunity.eligibility,
        });
        setJd("");
        setWebSearch(true);
        setMessage(COMPARE_PROMPT);
        setConversation(null);
        setMessages([]);
      })
      .catch((e) => {
        if (!cancelled && token === turn.current) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [driveId]);
  const refresh = async () =>
    setHistory(await studentFetch<Conversation[]>("conversations"));
  const newChat = () => {
    setHistoryOpen(false);
    loadRequest.current?.abort();
    sending.current = false;
    setOpening(false);
    speech.stop();
    setResume("");
    setJd("");
    setDrive(null);
    setDriveGone(false);
    setAttachmentOpen(false);
    setWebSearch(savedSearchPreference());
    turn.current++;
    setConversation(null);
    setMessages([]);
    setMessage("");
    setError("");
    setAttachment(null);
    setBusy(false);
  };
  const open = async (id: string) => {
    setHistoryOpen(false);
    const token = ++turn.current;
    loadRequest.current?.abort();
    const controller = new AbortController();
    loadRequest.current = controller;
    sending.current = false;
    speech.stop();
    setOpening(true);
    setError("");
    setBusy(false);
    try {
      const data = await studentFetch<{
        messages: ChatMessage[];
        context: { resume?: string; jd?: string; driveId?: string };
        drive: { id: string; company: string; title: string } | null;
      }>(`conversations/${id}`, { signal: controller.signal });
      if (token !== turn.current) return;
      setConversation(id);
      setMessages(data.messages);
      setResume(data.context.resume || "");
      setJd(data.context.jd || "");
      setDrive(data.drive);
      // The drive is no longer published for this student: the comparison can't continue.
      setDriveGone(!!data.context.driveId && !data.drive);
      setWebSearch(!!data.context.driveId || savedSearchPreference());
      // An attachment belongs to the conversation it was added in.
      setAttachment(null);
      setAttachmentOpen(false);
      setMessage("");
      setHistoryOpen(false);
    } catch (e) {
      if (token === turn.current && (e as Error).name !== "AbortError") setError((e as Error).message);
    } finally { if (token === turn.current) setOpening(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this conversation and its messages?")) return;
    try {
      await studentFetch(`conversations/${id}/delete`, {
        method: "POST",
        body: {},
      });
      if (conversation === id) newChat();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const clear = async () => {
    if (
      !window.confirm(
        "Delete all your student conversations? This cannot be undone.",
      )
    )
      return;
    try {
      await studentFetch("conversations/clear", {
        method: "POST",
        body: { confirmed: true },
      });
      newChat();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const send = async (text = message, retryId?: string) => {
    const content = text.trim();
    if (sending.current) return;
    if (opening) { setError("Wait for this conversation to finish opening, then send your question."); return; }
    if (driveGone) { setError("This drive is no longer available. Start a new F.R.I.D.A.Y. conversation to ask a question."); return; }
    if (!content) { composer.current?.focus(); return; }
    if (service.state === "unconfigured") { setError("F.R.I.D.A.Y.’s AI connection needs to be configured. Your question is kept here."); return; }
    sending.current = true;
    followConversation.current = true;
    speech.stop();
    const token = ++turn.current;
    const pendingId = retryId || crypto.randomUUID();
    // A retried message moves to the end, where the server will store it.
    setMessages((previous) => [
      ...previous.filter((item) => item.id !== pendingId),
      { id: pendingId, role: "user", content, card: null, status: "sending" },
    ]);
    if (!retryId) setMessage("");
    setBusy(true);
    setError("");
    try {
      let id = conversation;
      if (!id) {
        const created = await studentFetch<{ id: string }>("conversations", {
          method: "POST",
          body: drive ? { driveId: drive.id } : { title: content.slice(0, 120), jd },
        });
        id = created.id;
        // Ignore if the student switched conversations while this was created.
        if (token !== turn.current) return;
        setConversation(id);
      }
      const result = await studentFetch<{
        text: string;
        card: CareerCard | null;
        sources: Source[];
        research?: Research;
        researchInfo?: ResearchInfo;
        needsResume?: boolean;
      }>(`conversations/${id}/message`, {
        method: "POST",
        body: {
          message: content,
          webSearch,
          ...(attachment ? { documentId: attachment.id } : {}),
          ...(resume ? { resume } : {}),
          ...(jd && !drive ? { jd } : {}),
        },
      });
      if (token !== turn.current) return;
      setMessages((previous) => [
        ...previous.map((item) =>
          item.id === pendingId ? { ...item, status: undefined, error: undefined } : item,
        ),
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.text,
          card: result.card,
          sources: result.sources,
          research: result.research,
          researchInfo: result.researchInfo,
          animate: true,
          needsResume: result.needsResume,
        },
      ]);
      setAttachment(null);
      setAttachmentOpen(false);
      // The message is saved: a failed list refresh must not mark it "Not sent".
      void refresh().catch(() => {});
    } catch (e) {
      if (token === turn.current)
        setMessages((previous) =>
          previous.map((item) =>
            item.id === pendingId
              ? { ...item, status: "failed", error: (e as Error).message }
              : item,
          ),
        );
    } finally {
      if (token === turn.current) { setBusy(false); sending.current = false; }
    }
  };
  const editFailed = (item: ChatMessage) => {
    setMessages((previous) => previous.filter((entry) => entry.id !== item.id));
    usePrompt(item.content);
  };
  const activeTitle = history.find((item) => item.id === conversation)?.title || (drive ? `${drive.company} · ${drive.title}` : "A fresh perspective");
  const historyGroups = groupFridayHistory(history, search);
  const sidebar = (mobile = false) => (
    <>
      <div className="hk-sidebar-brand">
        <span className="hk-sidebar-logo"><Eye size={23} strokeWidth={1.5} /></span>
        <strong>F.R.I.D.A.Y.<span>Student workspace</span></strong>
        <button ref={mobile ? undefined : sidebarClose} type="button" className="hk-nav-icon" aria-label={mobile ? "Close conversation history" : "Collapse sidebar"} onClick={() => { if (mobile) setHistoryOpen(false); else { setSidebarCollapsed(true); requestAnimationFrame(() => mainSidebarToggle.current?.focus()); } }}>{mobile ? <X size={19} /> : <PanelLeftClose size={19} />}</button>
      </div>
      <nav className="hk-sidebar-actions" aria-label="Chat actions">
        <button type="button" onClick={newChat} aria-label="New conversation"><SquarePen size={18} /><span>New chat</span></button>
        <label className="hk-sidebar-search"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats" aria-label="Search conversations" /></label>
        <button type="button" aria-label={drive ? "Add or edit resume" : "Resume and job description"} onClick={() => { setHistoryOpen(false); review.current?.showModal(); }}><FileSearch size={18} /><span>Resume & job description</span></button>
      </nav>
      <div className="hk-sidebar-recents" tabIndex={0} aria-label="Recent conversations">
        <h2>Recents</h2>
        {historyGroups.map(group => <section className="hk-recents-group" key={group.label} aria-label={group.label}>
          <h3>{group.label}</h3>
          {group.conversations.map(item => <div className={`hk-recent-row${conversation === item.id ? " is-active" : ""}`} key={item.id}>
            <button type="button" aria-current={conversation === item.id ? "true" : undefined} title={item.title} onClick={() => void open(item.id)}><span>{item.title}</span></button>
            <button type="button" className="hk-recent-delete" aria-label={`Delete ${item.title}`} onClick={() => void remove(item.id)}><Trash2 size={14} /></button>
          </div>)}
        </section>)}
        {!historyGroups.length && <div className="hk-sidebar-empty"><MessageSquare size={20} /><strong>{search.trim() ? "No chats found" : "Your chats, all in one place"}</strong><p>{search.trim() ? "Try another word to find a conversation." : "Start a conversation and return to it here."}</p></div>}
      </div>
      <div className="hk-sidebar-footer">
        <Link href="/student/dashboard" className="hk-dashboard-link" aria-label="Back to dashboard"><ArrowLeft size={18} /><span>Back to dashboard</span></Link>
        <details className="hk-sidebar-settings"><summary><Settings2 size={17} /><span>Chat settings</span></summary><p>Conversations are saved in your student workspace.</p><button type="button" onClick={() => void clear()} disabled={!history.length}><Trash2 size={14} />Clear all chats</button></details>
        <div className="hk-sidebar-privacy"><ShieldCheck size={13} /><span>Your private student workspace</span></div>
      </div>
    </>
  );
  return (
    <div className={`hk-page${sidebarCollapsed ? " hk-sidebar-collapsed" : ""}${resizingSidebar ? " hk-resizing-sidebar" : ""}`} style={{ "--hk-sidebar-width": `${visibleSidebarWidth}px` } as CSSProperties}>
      <div
        className="st-chat-workspace hk-workspace"
      >
        <aside id="hk-conversation-sidebar" className="hk-sidebar" aria-label="Chat sidebar" hidden={sidebarCollapsed}>{sidebar()}</aside>
        <div className="hk-sidebar-resizer" role="separator" aria-label="Resize chat sidebar" aria-orientation="vertical" aria-valuemin={SIDEBAR_MIN} aria-valuemax={sidebarLimit} aria-valuenow={visibleSidebarWidth} aria-valuetext={`${visibleSidebarWidth} pixels wide`} aria-controls="hk-conversation-sidebar" tabIndex={sidebarCollapsed ? -1 : 0}
          onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); sidebarDrag.current = { x: e.clientX, width: visibleSidebarWidth, value: visibleSidebarWidth }; setResizingSidebar(true); }}
          onPointerMove={e => { const drag = sidebarDrag.current; if (drag) drag.value = resizeSidebar(drag.width + e.clientX - drag.x); }}
          onPointerUp={e => { const drag = sidebarDrag.current; if (!drag) return; resizeSidebar(drag.value, true); sidebarDrag.current = null; setResizingSidebar(false); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
          onLostPointerCapture={() => { sidebarDrag.current = null; setResizingSidebar(false); }}
          onDoubleClick={() => resizeSidebar(264, true)}
          onKeyDown={e => { const step = e.shiftKey ? 30 : 10; const value = e.key === "ArrowLeft" ? visibleSidebarWidth - step : e.key === "ArrowRight" ? visibleSidebarWidth + step : e.key === "Home" ? SIDEBAR_MIN : e.key === "End" ? sidebarLimit : null; if (value !== null) { e.preventDefault(); resizeSidebar(value, true); } }}
          title="Drag to resize · Arrow keys to adjust · Double-click to reset"
        />
        <dialog id="hk-mobile-history" ref={historyDialog} className="hk-mobile-sidebar" aria-label="Conversation history" onCancel={() => setHistoryOpen(false)} onClose={() => setHistoryOpen(false)} onClick={e => { if (e.target === historyDialog.current) setHistoryOpen(false); }}>{sidebar(true)}</dialog>
        <section className="st-chat-main">
          <header>
            <div className="hk-main-brand">
              <button ref={mainSidebarToggle} type="button" className="hk-nav-icon hk-desktop-open" aria-label="Expand sidebar" aria-controls="hk-conversation-sidebar" aria-expanded={!sidebarCollapsed} onClick={() => { setSidebarCollapsed(false); requestAnimationFrame(() => sidebarClose.current?.focus()); }}><PanelLeftOpen size={21} /></button>
              <button type="button" className="hk-nav-icon hk-mobile-open" aria-label="Show conversations" aria-controls="hk-mobile-history" aria-expanded={historyOpen} onClick={() => setHistoryOpen(true)}><PanelLeftOpen size={21} /></button>
              <div><h1>F.R.I.D.A.Y.</h1><span className="hk-active-title" title={activeTitle}>{activeTitle}</span></div>
            </div>
            <small className={`hk-service hk-service-${service.state}`}><i />{service.state === "ready" ? "Ready to explore" : service.state === "checking" ? "Connecting" : service.state === "unconfigured" ? "Setup needed" : "Connection interrupted"}</small>
          </header>
          {(service.state === "unavailable" || service.state === "unconfigured") && (
            <div className="hk-service-banner" role="status"><div><strong>{service.state === "unconfigured" ? "F.R.I.D.A.Y. needs its AI connection configured." : "We couldn’t connect to F.R.I.D.A.Y."}</strong><p>{service.state === "unconfigured" ? "Ask your campus administrator to connect the assistant. Your conversations are still here." : service.message || "Check your connection and try again. Your draft stays here."}</p></div><button type="button" onClick={() => { void checkService(); void refresh().then(() => setError("")).catch((e) => setError(e.message)); }}><RotateCcw size={14} /> Reconnect</button></div>
          )}
          {driveGone && (
            <div className="st-drive-context" role="note">
              <BriefcaseBusiness size={16} aria-hidden="true" />
              <div>
                <strong>This drive is no longer available to you.</strong>
                <small>
                  It is not published for your batch any more, so this comparison can’t
                  continue. Start a new chat to keep going.
                </small>
              </div>
            </div>
          )}
          {drive && (
            <div className="st-drive-context" role="note">
              <BriefcaseBusiness size={16} aria-hidden="true" />
              <div>
                <strong>
                  Comparing with {drive.company} · {drive.title}
                </strong>
                <small>
                  The job description comes from the official drive record.
                  {drive.eligibility &&
                    (drive.eligibility.eligible
                      ? " Official eligibility: you meet the published criteria."
                      : ` Official eligibility: not eligible. ${drive.eligibility.gaps.join(" ")}`)}
                </small>
              </div>
              {!conversation && (
                <button
                  className="st-icon-button"
                  aria-label="Stop comparing with this drive"
                  onClick={() => {
                    setDrive(null);
                    setWebSearch(savedSearchPreference());
                    if (message === COMPARE_PROMPT) setMessage("");
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}
          <div
            className="st-chat-messages"
            ref={messageList}
            role="log"
            aria-label="Career conversation"
            aria-live="polite"
            onScroll={() => { const list = messageList.current; if (list) followConversation.current = list.scrollHeight - list.scrollTop - list.clientHeight < 100; }}
          >
            <div className="hk-thread">
            {opening ? <div className="hk-loading" role="status"><LoaderCircle size={22} /><p>Opening your conversation…</p></div> : !messages.length ? (
              <div className="st-chat-welcome">
                <h2>
                  {drive ? "Let’s explore this opportunity." : "What can I help you with?"}
                </h2>
                <p>
                  {drive
                    ? "Send the comparison to see each requirement against your resume evidence. Official eligibility stays separate from the advice."
                    : "Explore careers, build skills, or prepare for your next opportunity."}
                </p>
                {!drive && (
                  <div className="st-chat-starters">
                    {STARTERS.map(({title, description, prompt: suggestion, icon: Icon}, index) => (
                      <button key={title} onClick={() => usePrompt(suggestion)}>
                        <span className="hk-starter-icon"><Icon size={18} strokeWidth={1.6} /></span><span className="hk-starter-copy"><strong>{title}</strong><small>{description}</small></span><ArrowUpRight size={15} className="hk-starter-arrow" /><span className="hk-starter-number">0{index + 1}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((item) => (
                <article
                  className={`st-chat-message st-chat-${item.role}${item.status ? ` st-chat-${item.status}` : ""}`}
                  key={item.id}
                  aria-busy={item.status === "sending" ? "true" : undefined}
                  data-reveal={item.animate || undefined}
                >
                  <div className="hk-message-content">
                  <div className={`hk-message-label${item.role === "user" ? " st-visually-hidden" : ""}`}><span className="hk-message-avatar" aria-hidden="true">{item.role === "user" ? "Y" : <Eye size={15} />}</span><p className="st-eyebrow">{item.role === "user" ? "You" : "F.R.I.D.A.Y."}</p></div>
                  {item.role === "user" ? (
                    <p className="st-preserve">{item.content}</p>
                  ) : (
                    <RichText text={item.content} animate={item.animate} />
                  )}
                  {item.status === "failed" && (
                    <div className="st-chat-failed-note" role="alert">
                      <span>Not sent. {item.error}</span>
                      <button
                        className="st-button st-button-secondary"
                        disabled={busy}
                        onClick={() => void send(item.content, item.id)}
                      >
                        <RotateCcw size={13} />
                        Retry
                      </button>
                      <button
                        className="st-button st-button-secondary"
                        disabled={busy}
                        onClick={() => editFailed(item)}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  {item.needsResume && (
                    <div className="st-chat-resume">
                      <DocumentUpload
                        kind="resume"
                        label="Add your resume"
                        onReady={(document) => {
                          takeResume(document.content);
                          setMessage(COMPARE_PROMPT);
                        }}
                      />
                      {resume && (
                        <p className="st-muted" role="status">
                          Resume added. Send the comparison again when you’re ready.
                        </p>
                      )}
                    </div>
                  )}
                  {item.card && <CardView card={item.card} onAction={usePrompt} />}
                  {item.researchInfo && <details className="hk-search-activity"><summary><Globe size={14} /><span>{item.research === "used" ? `Searched ${item.researchInfo.resultCount} ${item.researchInfo.resultCount === 1 ? "page" : "pages"}` : item.research === "no-results" ? "No web results found" : "Web search unavailable"}</span></summary><p className="hk-search-query">{item.researchInfo.query}</p>{!!item.researchInfo.results?.length && <Sources sources={item.researchInfo.results} label="Search results · not all cited" />}</details>}
                  {item.research && RESEARCH_NOTE[item.research] && (
                    <p className="st-research-note">{RESEARCH_NOTE[item.research]}</p>
                  )}
                  {!!item.sources?.length && <Sources sources={item.sources} />}
                  {item.role === "assistant" && <div className="hk-answer-actions"><button onClick={() => void copyMessage(item)} aria-label={copied === item.id ? "Answer copied" : "Copy answer"}>{copied === item.id ? <Check size={13} /> : <Copy size={13} />}{copied === item.id ? "Copied" : "Copy answer"}</button></div>}
                  </div>
                </article>
              ))
            )}
            {busy && (
              <div className="st-chat-thinking" role="status">
                <span className="hk-thinking-eye"><Eye size={19} /></span><div><strong>{webSearch ? "Exploring sources & connecting the dots" : "Connecting the dots"}</strong><span>Putting together a useful answer for you<i /><i /><i /></span></div>
              </div>
            )}
            <div ref={end} />
            </div>
          </div>
          <div className="st-chat-compose">
            <ErrorNote message={error || speech.error} />
            {(resume || jd) && <div className="hk-context-chips">{resume && <button onClick={() => review.current?.showModal()}><FileText size={12} />Resume in context<Check size={11} /></button>}{jd && !drive && <button onClick={() => review.current?.showModal()}><BriefcaseBusiness size={12} />Job description added<Check size={11} /></button>}</div>}
            {attachmentOpen && (
              <div className="hk-attachment-tray"><div><strong>Give F.R.I.D.A.Y. a little more context</strong><button className="st-icon-button" aria-label="Close attachment tray" onClick={() => setAttachmentOpen(false)}><X size={15} /></button></div>
              <DocumentUpload
                kind="attachment"
                label="Add context to this conversation"
                onReady={setAttachment}
              />
              </div>
            )}
            {attachment && (
              <div className="st-attachment-chip">
                <Paperclip size={13} />
                {attachment.filename}
                <button
                  aria-label="Remove attachment"
                  onClick={() => setAttachment(null)}
                >
                  <X size={13} />
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Read the current field value so Enter, the send button and
                // browser input/autofill all submit the same up-to-date text.
                void send(composer.current?.value ?? message);
              }}
            >
              <textarea
                ref={composer}
                name="message"
                enterKeyHint="send"
                aria-describedby="friday-compose-help"
                aria-label="Message F.R.I.D.A.Y."
                placeholder={drive ? "Ask about this opportunity…" : "Ask anything about your next chapter…"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={4000}
                rows={2}
                disabled={opening}
                onKeyDown={(e) => {
                  // Enter while an input method is composing picks a candidate, not send.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <span id="friday-compose-help" className="st-visually-hidden">Press Enter to send your question. Press Shift and Enter together to add a new line.</span>
              <div>
                <div className="st-actions">
                  <button
                    type="button"
                    className="st-icon-button"
                    aria-label="Attach a document"
                    aria-expanded={attachmentOpen}
                    disabled={busy || opening}
                    onClick={() => setAttachmentOpen(!attachmentOpen)}
                  >
                    <Paperclip size={18} />
                  </button>
                  <button
                    type="button"
                    className={`st-web-toggle${webSearch ? " is-on" : ""}`}
                    aria-pressed={webSearch}
                    onClick={() => { if (service.researchReady === false) { void checkService(); return; } chooseWebSearch(!webSearch); }}
                    disabled={busy}
                    title={
                      service.researchReady === false ? "Web search is unavailable. Click to check the connection again." : drive
                        ? "Searches the company and role only"
                        : "Your question is sent to the configured search provider"
                    }
                  >
                    <Globe size={14} aria-hidden="true" />
                    <span>{service.researchReady === false ? "Check web search" : "Web search"}</span>
                  </button>
                  {speech.available && (
                    <button
                      type="button"
                      className="st-icon-button"
                      aria-pressed={speech.listening}
                      disabled={busy || opening}
                      aria-label={
                        speech.listening
                          ? "Stop voice input"
                          : "Use voice input"
                      }
                      onClick={speech.listening ? speech.stop : speech.start}
                    >
                      {speech.listening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                  <span className="st-muted hk-compose-hint">
                    {speech.listening
                      ? "Listening — review the transcript before sending"
                      : "Enter to send · Shift+Enter for a new line"}
                  </span>
                </div>
                <button
                  type="submit"
                  className="st-button"
                  disabled={busy || opening || driveGone || !message.trim() || service.state === "unconfigured"}
                  aria-label="Send message"
                >
                  {busy ? <LoaderCircle size={16} className="hk-spin" /> : <ArrowUp size={18} />}<span>{busy ? "Sending…" : "Send"}</span>
                </button>
              </div>
            </form>
            <small>
              F.R.I.D.A.Y. can make mistakes. Career advice is advisory. Your context is sent to the AI provider
              {webSearch
                ? drive
                  ? "; web search sends only the company and role to the search provider."
                  : "; web search sends your question to the search provider."
                : "."}
            </small>
          </div>
        </section>
      </div>
      <dialog
        className="st-dialog"
        ref={review}
        aria-label="Resume and JD review"
      >
        <div className="st-dialog-header">
          <h2>Put your experience in context.</h2>
          <button
            className="st-icon-button"
            aria-label="Close JD review"
            onClick={() => review.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="st-dialog-body st-form">
          <DocumentUpload
            kind="resume"
            label="Upload your resume"
            onReady={(document) => takeResume(document.content)}
          />
          <label>
            Resume context
            <textarea
              rows={8}
              value={resume}
              onChange={(e) => takeResume(e.target.value)}
              maxLength={60000}
            />
          </label>
          {drive ? (
            <p className="st-muted">
              The job description for {drive.company} · {drive.title} is taken
              from the official drive record, together with your official
              eligibility.
            </p>
          ) : (
            <label>
              Target job description
              <textarea
                rows={8}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                maxLength={20000}
              />
            </label>
          )}
          <button
            className="st-button"
            disabled={
              busy || resume.trim().length < 80 || (!drive && jd.trim().length < 40)
            }
            onClick={() => {
              review.current?.close();
              void send(
                drive
                  ? COMPARE_PROMPT
                  : "Compare my resume with this job description. Explain supporting evidence, missing skills and a practical improvement plan.",
              );
            }}
          >
            {drive ? "Compare with this drive ↗" : "Review against JD ↗"}
          </button>
          <p className="st-muted">
            {drive
              ? "Add at least 80 characters of resume context."
              : "Add at least 80 characters of resume context and 40 characters of JD text."}
          </p>
        </div>
      </dialog>
    </div>
  );
}

/** @deprecated Temporary compatibility export for an already-running legacy route. */
export const StudentChat = StudentFridayChat;
