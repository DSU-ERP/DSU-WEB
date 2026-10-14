"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ASSISTANT_TOOLS,
  type AssistantTool,
} from "@/lib/placement/assistantRules";
import { label, type Row } from "@/lib/placement/types";
type Message = {
  role: string;
  content: string;
  links?: { title: string; url: string }[];
  students?: Row[];
};
type Proposal = {
  id: string;
  to: string;
  name: string;
  subject: string;
  body: string;
  canSend: boolean;
};
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: {
        results: {
          [index: number]: { [index: number]: { transcript: string } };
        };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
async function request(body: Record<string, unknown>) {
  const response = await fetch("/placement/assistant-api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, requestId: crypto.randomUUID() }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("Your session expired. Sign in again.");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request failed.");
  return result;
}
export function AssistantChat({
  assistant,
  initialHistory,
  batches,
  initialDiagnostics,
}: {
  assistant: "friday" | "observation";
  initialHistory: Row[];
  batches: string[];
  initialDiagnostics: Record<string, string>;
}) {
  const [history, setHistory] = useState(initialHistory),
    [conversation, setConversation] = useState<string>(),
    [messages, setMessages] = useState<Message[]>([]),
    [message, setMessage] = useState(""),
    [tool, setTool] = useState<AssistantTool>("auto"),
    [batch, setBatch] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [diag, setDiag] = useState(initialDiagnostics),
    [spoken, setSpoken] = useState(false),
    [listening, setListening] = useState(false),
    [voiceAvailable, setVoiceAvailable] = useState(false);
  const [proposal, setProposal] = useState<Proposal>(),
    [recipient, setRecipient] = useState<Row>(),
    [subject, setSubject] = useState(""),
    [body, setBody] = useState("");
  const recognition = useRef<Recognition | null>(null),
    end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const w = window as SpeechWindow;
    setVoiceAvailable(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => {
      recognition.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-IN";
    window.speechSynthesis.speak(speech);
  }
  function microphone() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) return;
    const rec = new Constructor();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => setMessage(e.results[0][0].transcript);
    rec.onerror = () => {
      setListening(false);
      setError("Microphone access failed. You can type your request instead.");
    };
    rec.onend = () => setListening(false);
    recognition.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Microphone could not start.");
    }
  }
  async function refresh() {
    const response = await fetch(
      `/placement/assistant-api?assistant=${assistant}`,
      { cache: "no-store" },
    );
    if (!response.ok)
      throw new Error("Conversation history could not be loaded.");
    const data = await response.json();
    setHistory(data.data.rows);
    setDiag(data.diagnostics);
  }
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    recognition.current?.stop();
    window.speechSynthesis?.cancel();
    setConversation(undefined);
    setMessages([]);
    setProposal(undefined);
    setRecipient(undefined);
    setStatus("New conversation. Saved chats remain in history.");
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    const content = message;
    await run(async () => {
      const result = await request({
        operation: "ask",
        assistant,
        id: conversation,
        message: content,
        tool,
        batch,
      });
      setConversation(result.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "user", content },
        {
          role: "assistant",
          content: result.text,
          links: result.links,
          students: result.students,
        },
      ]);
      setMessage("");
      if (spoken) speak(result.text);
      await refresh();
    });
  }
  return (
    <div className="po-assistant">
      <aside className="erp-panel po-chat-history">
        <button
          type="button"
          className="erp-primary"
          disabled={busy}
          onClick={reset}
        >
          New chat / clear log
        </button>
        <h2>Saved conversations</h2>
        {!history.length && (
          <p className="po-note">Your conversations will appear here.</p>
        )}
        {history.map((c) => (
          <div key={String(c.id)} className="po-history-row">
            <button
              disabled={busy}
              type="button"
              aria-current={conversation === c.id ? "true" : undefined}
              onClick={() =>
                run(async () => {
                  const response = await fetch(
                    `/placement/assistant-api?id=${c.id}`,
                    { cache: "no-store" },
                  );
                  if (!response.ok)
                    throw new Error("Conversation could not be opened.");
                  const data = await response.json();
                  setConversation(String(c.id));
                  setMessages(data.data.messages);
                  setRecipient(undefined);
                  setProposal(undefined);
                })
              }
            >
              {String(c.title)}
            </button>
            <button
              disabled={busy}
              type="button"
              aria-label={`Delete conversation ${c.title}`}
              onClick={() => {
                if (
                  window.confirm("Delete this conversation and its messages?")
                )
                  void run(async () => {
                    await request({ operation: "delete", id: c.id });
                    if (conversation === c.id) reset();
                    await refresh();
                  });
              }}
            >
              ×
            </button>
          </div>
        ))}
      </aside>
      <section className="erp-panel po-chat">
        <div className="po-actions">
          <label>
            Batch{" "}
            <select value={batch} onChange={(e) => setBatch(e.target.value)}>
              <option value="">All batches</option>
              {batches.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          {assistant === "friday" && (
            <>
              <button
                type="button"
                className="erp-secondary"
                disabled={!voiceAvailable || busy}
                onClick={microphone}
              >
                {listening ? "Stop microphone" : "Use microphone"}
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={spoken}
                  onChange={(e) => {
                    setSpoken(e.target.checked);
                    if (!e.target.checked) window.speechSynthesis?.cancel();
                  }}
                />{" "}
                Speak responses
              </label>
              <button
                type="button"
                onClick={() => window.speechSynthesis?.cancel()}
              >
                Stop audio
              </button>
            </>
          )}
        </div>
        {assistant === "friday" && !voiceAvailable && (
          <p className="po-note">
            Voice input is unavailable in this browser. Text requests remain
            available.
          </p>
        )}
        <div
          className="po-chat-log"
          role="log"
          aria-label="Conversation"
          aria-live="polite"
        >
          {!messages.length && (
            <>
              <h2>What would you like to explore?</h2>
              <div className="po-actions">
                {[
                  "Batch summary",
                  "Top eligible candidates",
                  "Recent drives",
                  "Placement summary",
                  "Master test results",
                  "Search web: graduate jobs",
                ].map((p) => (
                  <button
                    className="erp-secondary"
                    type="button"
                    key={p}
                    onClick={() => {
                      setTool("auto");
                      setMessage(p);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="po-note">
                For a student profile, enter “Find student” followed by a name
                or USN. Choose a tool below when you want a particular report.
              </p>
            </>
          )}
          {messages.map((m, i) => (
            <article className={`po-message po-message-${m.role}`} key={i}>
              <strong>
                {m.role === "user"
                  ? "You"
                  : assistant === "friday"
                    ? "F.R.I.D.A.Y."
                    : "Observation Haki"}
              </strong>
              <p>{m.content}</p>
              {m.links?.map((l) =>
                l.url.startsWith("/placement/") ? (
                  <Link key={l.url} href={l.url}>
                    {l.title} ↗
                  </Link>
                ) : (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.title} ↗
                  </a>
                ),
              )}
              {m.students?.length ? (
                <div className="po-actions">
                  {m.students.map((s) => (
                    <button
                      key={String(s.id)}
                      type="button"
                      onClick={() => {
                        setRecipient(s);
                        setProposal(undefined);
                        setSubject("Placement opportunity");
                        setBody(`Dear ${s.name},\n\n`);
                      }}
                    >
                      Draft email to {String(s.name)}
                    </button>
                  ))}
                </div>
              ) : null}
              {assistant === "friday" && m.role === "assistant" && (
                <button type="button" onClick={() => speak(m.content)}>
                  Replay response
                </button>
              )}
            </article>
          ))}
          <div ref={end} />
        </div>
        <form onSubmit={ask} className="po-chat-compose">
          <label>
            Tool
            <select
              value={tool}
              onChange={(e) => setTool(e.target.value as AssistantTool)}
            >
              {ASSISTANT_TOOLS.map((t) => (
                <option key={t} value={t}>
                  {label(t)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Message
            <textarea
              required
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about your campus…"
            />
          </label>
          <button className="erp-primary" disabled={busy || !message.trim()}>
            {busy ? "Working…" : "Send request"}
          </button>
        </form>
        {recipient && !proposal && (
          <form
            className="po-form po-email-draft"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const result = await request({
                  operation: "draft",
                  draft: { student_id: recipient.id, subject, body },
                });
                setProposal(result.proposal);
              });
            }}
          >
            <h2>Email {String(recipient.name)}</h2>
            <label>
              Subject
              <input
                required
                maxLength={180}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label>
              Message
              <textarea
                required
                maxLength={10000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <button className="erp-secondary" disabled={busy}>
              Review draft
            </button>
          </form>
        )}
        {proposal && (
          <section className="po-email-draft">
            <h2>Review before sending</h2>
            <p>
              To: {proposal.name} · {proposal.to}
            </p>
            <h3>{proposal.subject}</h3>
            <p className="po-preserve">{proposal.body}</p>
            {!proposal.canSend && (
              <p className="po-note">
                Email delivery is not configured. You can copy this draft.
              </p>
            )}
            <div className="po-actions">
              <button
                className="erp-primary"
                disabled={busy || !proposal.canSend}
                onClick={() =>
                  run(async () => {
                    const result = await request({
                      operation: "confirm",
                      id: proposal.id,
                    });
                    setStatus(result.message);
                    setProposal(undefined);
                    setRecipient(undefined);
                  })
                }
              >
                Confirm and send email
              </button>
              <button
                className="erp-secondary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await request({ operation: "cancel", id: proposal.id });
                    setProposal(undefined);
                    setRecipient(undefined);
                    setStatus("Email cancelled.");
                  })
                }
              >
                Cancel
              </button>
            </div>
          </section>
        )}
        {error && (
          <p className="erp-error" role="alert">
            {error}
          </p>
        )}
        {status && <p role="status">{status}</p>}
        <details className="po-note">
          <summary>Assistant diagnostics</summary>
          {Object.entries(diag).map(([k, v]) => (
            <p key={k}>
              {label(k)}: {v}
            </p>
          ))}
          <p>
            Only reviewed email drafts can be executed here. Create or edit
            drives through Drive management.
          </p>
          <button type="button" disabled={busy} onClick={() => run(refresh)}>
            Refresh diagnostics
          </button>
        </details>
      </section>
    </div>
  );
}
