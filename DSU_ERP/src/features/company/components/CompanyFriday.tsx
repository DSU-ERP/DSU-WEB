"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { companyFetch } from "../lib/client";

type Thread = { id: string; title: string; updated_at: string };
type Message = { id?: number; role: "user" | "assistant"; content: string };
const SUGGESTIONS = [
  "Which of my drives are live and when do applications close?",
  "How many applicants are in each round of my drive?",
  "Which of my drive requests are still with the placement office?",
  "List the selected candidates for my drive.",
];

/** F.R.I.D.A.Y. for a recruiting company: answers only about its own drives and released applicants. */
export function CompanyFriday({ company }: { company: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    companyFetch<Thread[]>("friday/conversations").then(setThreads, (e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);
  const open = async (id: string) => {
    setError("");
    setActive(id);
    try {
      const thread = await companyFetch<{ messages: Message[] }>(`friday/conversations/${id}`);
      setMessages(thread.messages);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    setDraft("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    try {
      let id = active;
      if (!id) {
        const thread = await companyFetch<Thread>("friday/conversations", { method: "POST", body: {} });
        id = thread.id;
        setActive(id);
      }
      const answer = await companyFetch<{ text: string }>(`friday/conversations/${id}/message`, { method: "POST", body: { message } });
      setMessages((m) => [...m, { role: "assistant", content: answer.text }]);
      setThreads(await companyFetch<Thread[]>("friday/conversations"));
    } catch (e) {
      setError((e as Error).message);
      setMessages((m) => m.slice(0, -1));
      setDraft(message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await companyFetch(`friday/conversations/${id}/delete`, { method: "POST", body: {} });
      setThreads((t) => t.filter((x) => x.id !== id));
      if (active === id) {
        setActive(null);
        setMessages([]);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="co-chat">
      <aside className="co-chat-list" aria-label="Conversations">
        <button type="button" className="erp-secondary" onClick={() => { setActive(null); setMessages([]); setError(""); }}>
          <Plus size={14} aria-hidden="true" />
          &nbsp;New conversation
        </button>
        <ul>
          {threads.map((thread) => (
            <li key={thread.id} style={{ display: "flex", gap: "0.25rem" }}>
              <button type="button" className="co-thread" aria-current={thread.id === active || undefined} onClick={() => void open(thread.id)}>
                {thread.title}
              </button>
              <button type="button" className="cp-icon-button" aria-label={`Delete ${thread.title}`} onClick={() => void remove(thread.id)}>
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="co-chat-main" aria-label="F.R.I.D.A.Y.">
        <div className="co-chat-messages" aria-live="polite">
          {!messages.length && (
            <div className="co-chat-intro">
              <h1>F.R.I.D.A.Y.</h1>
              <p className="erp-muted">
                Ask about {company}&apos;s drives on the DSU portal: review status, dates, and applicants the placement office has released to
                you. It cannot see other companies or students who have not applied to your drives.
              </p>
              <div className="co-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} disabled={busy}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={m.id ?? `local-${i}`} className={`co-msg co-msg-${m.role}`}>
              {m.content}
            </div>
          ))}
          {busy && <p className="erp-muted" role="status">F.R.I.D.A.Y. is checking your drives…</p>}
          {error && <p className="erp-form-error" role="alert">{error}</p>}
          <div ref={end} />
        </div>
        <form className="co-chat-form" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            maxLength={4000}
            placeholder="Ask about your drives and applicants"
            aria-label="Message F.R.I.D.A.Y."
            rows={1}
          />
          <button className="erp-primary" disabled={busy || !draft.trim()} aria-label="Send">
            <Send size={15} aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  );
}
