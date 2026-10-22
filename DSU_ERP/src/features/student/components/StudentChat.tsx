"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Search,
  Trash2,
  Send,
  Mic,
  PanelLeftClose,
  FileSearch,
  X,
  Paperclip,
} from "lucide-react";
import { studentFetch } from "../lib/client";
import { useSpeechInput } from "../lib/useSpeech";
import { DocumentUpload, type UploadedDocument } from "./DocumentUpload";
import { ErrorNote } from "./UI";
import type { Opportunity } from "./Placement";
type CareerCard = {
  type: string;
  title: string;
  summary: string;
  score: number | null;
  items: { label: string; description: string; status: string }[];
  actions: string[];
};
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  card: CareerCard | null;
  sources?: { title: string; url: string; description: string }[];
};
type Conversation = { id: string; title: string; updated_at: string };
export function StudentChat({
  initial,
  driveId,
  prompt,
}: {
  initial: Conversation[];
  driveId?: string;
  prompt?: string;
}) {
  const [history, setHistory] = useState(initial),
    [conversation, setConversation] = useState<string | null>(null),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [message, setMessage] = useState(prompt || ""),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [historyOpen, setHistoryOpen] = useState(true),
    [attachmentOpen, setAttachmentOpen] = useState(false),
    [attachment, setAttachment] = useState<UploadedDocument | null>(null),
    [resume, setResume] = useState(""),
    [jd, setJd] = useState("");
  const review = useRef<HTMLDialogElement>(null),
    end = useRef<HTMLDivElement>(null);
  const speech = useSpeechInput(setMessage);
  const turn = useRef(0);
  useEffect(() => {
    if (window.innerWidth < 760) setHistoryOpen(false);
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  useEffect(() => {
    if (!driveId) return;
    void studentFetch<Opportunity>(`opportunities/${driveId}`)
      .then((drive) => {
        setJd(
          `${drive.company} — ${drive.title}\n${drive.description}\nRequired skills: ${drive.skills}\nOfficial minimum CGPA: ${drive.min_cgpa}`,
        );
        setMessage(
          `Compare my profile and resume with ${drive.company}'s ${drive.title} opportunity. Explain evidence, gaps and practical next steps; distinguish advisory fit from official eligibility.`,
        );
        setConversation(null);
        setMessages([]);
      })
      .catch((e) => setError(e.message));
  }, [driveId]);
  const refresh = async () =>
    setHistory(await studentFetch<Conversation[]>("conversations"));
  const newChat = () => {
    setResume("");
    setJd("");
    turn.current++;
    setConversation(null);
    setMessages([]);
    setMessage("");
    setError("");
    setAttachment(null);
    setBusy(false);
  };
  const open = async (id: string) => {
    turn.current++;
    setError("");
    try {
      const data = await studentFetch<{
        messages: ChatMessage[];
        context: { resume?: string; jd?: string };
      }>(`conversations/${id}`);
      setConversation(id);
      setMessages(data.messages);
      setResume(data.context.resume || "");
      setJd(data.context.jd || "");
      if (window.innerWidth < 760) setHistoryOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
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
  const send = async (text = message) => {
    if (busy || !text.trim()) return;
    const token = ++turn.current;
    setBusy(true);
    setError("");
    try {
      let id = conversation;
      if (!id) {
        const created = await studentFetch<{ id: string }>("conversations", {
          method: "POST",
          body: { title: text.slice(0, 120), jd },
        });
        id = created.id;
        // Ignore if the student switched conversations while this was created.
        if (token !== turn.current) return;
        setConversation(id);
      }
      const result = await studentFetch<{
        text: string;
        card: CareerCard | null;
        sources: ChatMessage["sources"];
      }>(`conversations/${id}/message`, {
        method: "POST",
        body: {
          message: text.trim(),
          ...(attachment ? { documentId: attachment.id } : {}),
          ...(resume ? { resume } : {}),
          ...(jd ? { jd } : {}),
        },
      });
      if (token !== turn.current) return;
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "user", content: text, card: null },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.text,
          card: result.card,
          sources: result.sources,
        },
      ]);
      setMessage("");
      setAttachment(null);
      setAttachmentOpen(false);
      await refresh();
    } catch (e) {
      if (token === turn.current) setError((e as Error).message);
    } finally {
      if (token === turn.current) setBusy(false);
    }
  };
  return (
    <>
      <div className="st-chat-heading">
        <div>
          <p className="st-eyebrow">
            <i />
            YOUR CAREER THINKING PARTNER
          </p>
          <h1>Observation Haki.</h1>
        </div>
        <Link
          className="st-button st-button-secondary"
          href="/student/dashboard"
        >
          ← Dashboard
        </Link>
      </div>
      <div
        className={`st-chat-workspace${!historyOpen ? " st-chat-history-hidden" : ""}`}
      >
        <aside className="st-chat-history">
          <div className="st-actions">
            <button className="st-button" onClick={newChat}>
              <Plus size={15} />
              New chat
            </button>
            <button
              className="st-icon-button"
              aria-label="Hide conversations"
              onClick={() => setHistoryOpen(false)}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          <label className="st-chat-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a conversation"
              aria-label="Search conversations"
            />
          </label>
          <div>
            {history
              .filter((item) =>
                item.title.toLowerCase().includes(search.toLowerCase()),
              )
              .map((item) => (
                <div className="st-chat-history-row" key={item.id}>
                  <button
                    aria-current={conversation === item.id ? "true" : undefined}
                    onClick={() => void open(item.id)}
                  >
                    {item.title}
                  </button>
                  <button
                    className="st-icon-button"
                    aria-label={`Delete ${item.title}`}
                    onClick={() => void remove(item.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            {!history.length && (
              <p className="st-muted">
                A good question is a useful place to start. Your conversations
                will appear here.
              </p>
            )}
          </div>
          <button
            className="st-chat-clear st-muted"
            onClick={() => void clear()}
            disabled={!history.length}
          >
            Clear conversation history
          </button>
        </aside>
        <section className="st-chat-main">
          <header>
            <div className="st-actions">
              {!historyOpen && (
                <button
                  className="st-icon-button"
                  aria-label="Show conversations"
                  onClick={() => setHistoryOpen(true)}
                >
                  <PanelLeftClose size={18} />
                </button>
              )}
              <Sparkles size={17} />
              <span>DSU GPT</span>
            </div>
            <button
              className="st-button st-button-secondary"
              onClick={() => review.current?.showModal()}
            >
              <FileSearch size={15} />
              Review resume vs JD
            </button>
          </header>
          <div
            className="st-chat-messages"
            role="log"
            aria-label="Career conversation"
            aria-live="polite"
          >
            {!messages.length ? (
              <div className="st-chat-welcome">
                <div className="st-ai-orbit" aria-hidden="true">
                  <Sparkles size={33} />
                </div>
                <p className="st-eyebrow">A LITTLE CLARITY GOES A LONG WAY.</p>
                <h2>How can I help you move forward?</h2>
                <p>
                  Think through a role, strengthen your evidence or turn a gap
                  into a practical plan.
                </p>
                <div className="st-chat-starters">
                  {[
                    "Help me choose my next preparation step.",
                    "Review my profile through a recruiter’s lens.",
                    "Build a practical skill roadmap for my target role.",
                    "What evidence would strengthen my resume?",
                  ].map((item) => (
                    <button key={item} onClick={() => setMessage(item)}>
                      {item} <span>↗</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((item) => (
                <article
                  className={`st-chat-message st-chat-${item.role}`}
                  key={item.id}
                >
                  <p className="st-eyebrow">
                    {item.role === "user" ? "YOU" : "OBSERVATION HAKI"}
                  </p>
                  <p className="st-preserve">{item.content}</p>
                  {item.card && (
                    <section className="st-career-card">
                      <span className="st-tag">
                        {item.card.type} · AI guidance
                      </span>
                      <h3>{item.card.title}</h3>
                      <p className="st-muted">{item.card.summary}</p>
                      {item.card.score !== null && (
                        <p className="st-muted">
                          Advisory estimate: {item.card.score}/100
                        </p>
                      )}
                      {item.card.items.map((finding, index) => (
                        <div className="st-list-row" key={index}>
                          <div>
                            <strong>{finding.label}</strong>
                            <p>{finding.description}</p>
                          </div>
                          <span className="st-tag">{finding.status}</span>
                        </div>
                      ))}
                      <div className="st-actions">
                        {item.card.actions.map((action) => (
                          <button
                            key={action}
                            className="st-button st-button-secondary"
                            onClick={() => setMessage(action)}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  {!!item.sources?.length && (
                    <details>
                      <summary>Sources</summary>
                      {item.sources
                        .filter((source) => /^https?:\/\//.test(source.url))
                        .map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {source.title} ↗
                          </a>
                        ))}
                    </details>
                  )}
                </article>
              ))
            )}
            {busy && (
              <div className="st-chat-thinking" role="status">
                <i />
                <i />
                <i />
                <span>Thinking through your question…</span>
              </div>
            )}
            <div ref={end} />
          </div>
          <div className="st-chat-compose">
            <ErrorNote message={error || speech.error} />
            {attachmentOpen && (
              <DocumentUpload
                kind="attachment"
                label="Add context to this conversation"
                onReady={setAttachment}
              />
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
                void send();
              }}
            >
              <textarea
                aria-label="Message Observation Haki"
                placeholder="What would you like to work through?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={4000}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <div>
                <div className="st-actions">
                  <button
                    type="button"
                    className="st-icon-button"
                    aria-label="Attach a document"
                    onClick={() => setAttachmentOpen(!attachmentOpen)}
                  >
                    <Paperclip size={18} />
                  </button>
                  {speech.available && (
                    <button
                      type="button"
                      className="st-icon-button"
                      aria-label={
                        speech.listening
                          ? "Stop voice input"
                          : "Use voice input"
                      }
                      onClick={speech.listening ? speech.stop : speech.start}
                    >
                      <Mic size={18} />
                    </button>
                  )}
                  <span className="st-muted">
                    {speech.listening
                      ? "Listening — review the transcript before sending"
                      : "Enter to send · Shift+Enter for a new line"}
                  </span>
                </div>
                <button
                  type="submit"
                  className="st-button"
                  disabled={busy || !message.trim()}
                  aria-label="Send message"
                >
                  <Send size={15} />
                  {busy ? "Preparing…" : "Send"}
                </button>
              </div>
            </form>
            <small>
              Career guidance is advisory. Your profile and supplied text are
              sent to the configured AI provider.
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
            onReady={(document) => setResume(document.content)}
          />
          <label>
            Resume context
            <textarea
              rows={8}
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              maxLength={60000}
            />
          </label>
          <label>
            Target job description
            <textarea
              rows={8}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              maxLength={20000}
            />
          </label>
          <button
            className="st-button"
            disabled={
              busy || resume.trim().length < 80 || jd.trim().length < 40
            }
            onClick={() => {
              review.current?.close();
              void send(
                "Compare my resume with this job description. Explain supporting evidence, missing skills and a practical improvement plan.",
              );
            }}
          >
            Review against JD ↗
          </button>
          <p className="st-muted">
            Add at least 80 characters of resume context and 40 characters of JD
            text.
          </p>
        </div>
      </dialog>
    </>
  );
}
