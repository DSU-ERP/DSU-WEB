"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Row } from "@/lib/placement/types";
import { speakable, sentences } from "@/lib/friday/protocol";

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  state: "streaming" | "complete" | "interrupted";
};

type Capabilities = {
  chat: boolean;
  model: string;
  provider: string;
  serverSpeechToText: boolean;
  serverTextToSpeech: boolean;
};

// Only shown when the underlying operation is actually running.
const STATE_LABEL: Record<string, string> = {
  ready: "Ready",
  listening: "Listening",
  transcribing: "Transcribing",
  preparing: "Preparing answer",
  retrieving: "Retrieving campus information",
  responding: "Responding",
  speaking: "Speaking",
  stopped: "Stopped",
  interrupted: "Connection interrupted",
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof ctor === "function"
    ? (ctor as new () => SpeechRecognitionLike)
    : null;
}

export function FridayChat({
  initialHistory,
  initialCapabilities,
}: {
  initialHistory: Row[];
  initialCapabilities: Capabilities;
}) {
  const [history, setHistory] = useState(initialHistory);
  const [conversation, setConversation] = useState<string>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<string>("ready");
  const [toolNote, setToolNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [lastSpoken, setLastSpoken] = useState("");
  const caps = initialCapabilities;

  const abort = useRef<AbortController | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const media = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  // Guards against a late stream landing in a different conversation.
  const turnToken = useRef(0);
  const logEnd = useRef<HTMLDivElement>(null);

  const sttAvailable = typeof window !== "undefined" && !!recognitionCtor();
  const ttsAvailable =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const stopAudio = useCallback(() => {
    if (ttsAvailable) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [ttsAvailable]);

  const releaseMic = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    recognition.current?.abort();
    recognition.current = null;
    media.current?.getTracks().forEach((t) => t.stop());
    media.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    setLevel(0);
    setListening(false);
  }, []);

  useEffect(
    () => () => {
      abort.current?.abort();
      releaseMic();
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    },
    [releaseMic],
  );

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  function speak(text: string) {
    if (!voiceOut || !ttsAvailable) return;
    const body = speakable(text);
    if (!body) return;
    window.speechSynthesis.cancel();
    // Queue complete sentences so playback stays in order.
    const parts = sentences(body);
    const voices = window.speechSynthesis.getVoices();
    const british =
      voices.find((v) => v.lang === "en-GB") ??
      voices.find((v) => v.lang?.startsWith("en-GB"));
    parts.forEach((sentence, i) => {
      const u = new SpeechSynthesisUtterance(sentence.trim());
      if (british) u.voice = british;
      u.rate = 0.98;
      u.pitch = 1;
      if (i === 0) u.onstart = () => setSpeaking(true);
      if (i === parts.length - 1) {
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
      }
      window.speechSynthesis.speak(u);
    });
    setLastSpoken(text);
  }

  async function startListening() {
    setError("");
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError(
        "This browser does not provide speech recognition. Type your question instead.",
      );
      return;
    }
    stopAudio();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone permission was declined. Type your question instead."
          : "No microphone is available. Type your question instead.",
      );
      return;
    }
    media.current = stream;

    // Level meter reads the real input signal, not an animation.
    try {
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 90));
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // A missing AudioContext only costs the meter, not recognition.
    }

    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event: unknown) => {
      const e = event as {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      };
      let text = "";
      for (let i = 0; i < e.results.length; i++)
        text += e.results[i][0]?.transcript ?? "";
      setState("transcribing");
      setDraft(text.trim());
    };
    rec.onerror = (event: unknown) => {
      const e = event as { error?: string };
      setError(
        e.error === "no-speech"
          ? "No speech was detected. Try again or type the question."
          : "Speech recognition stopped unexpectedly. Type your question instead.",
      );
      releaseMic();
      setState("ready");
    };
    rec.onend = () => {
      releaseMic();
      setState((s) => (s === "transcribing" || s === "listening" ? "ready" : s));
    };
    recognition.current = rec;
    setListening(true);
    setState("listening");
    rec.start();
  }

  function stopListening() {
    recognition.current?.stop();
    releaseMic();
    setState("ready");
  }

  function stopGenerating() {
    abort.current?.abort();
    abort.current = null;
    setBusy(false);
    setState("stopped");
    setToolNote("");
    setTurns((t) =>
      t.map((x) =>
        x.state === "streaming" ? { ...x, state: "interrupted" } : x,
      ),
    );
  }

  async function send(question: string, spoken: boolean) {
    if (!question.trim() || busy) return;
    if (!caps.chat) {
      setError(
        "The assistant is not configured on this server. Ask an administrator to set OPENROUTER_API_KEY.",
      );
      return;
    }
    setError("");
    setToolNote("");
    stopAudio();
    const token = ++turnToken.current;
    const conversationAtSend = conversation;
    const answerId = crypto.randomUUID();

    setTurns((t) => [
      ...t,
      { id: crypto.randomUUID(), role: "user", content: question, state: "complete" },
      { id: answerId, role: "assistant", content: "", state: "streaming" },
    ]);
    setDraft("");
    setBusy(true);
    setState("preparing");

    const controller = new AbortController();
    abort.current = controller;
    let text = "";
    let finished = false;

    try {
      const res = await fetch("/placement/friday-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          message: question,
          spoken,
          id: conversationAtSend,
        }),
      });

      // Never parse blindly: an HTML error page must not become
      // "Unexpected token '<'".
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("text/event-stream")) {
        let detail = `The assistant request failed (${res.status}).`;
        if (contentType.includes("application/json")) {
          const body: unknown = await res.json().catch(() => null);
          if (
            body &&
            typeof body === "object" &&
            typeof (body as { error?: unknown }).error === "string"
          )
            detail = (body as { error: string }).error;
        }
        throw new Error(detail);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("The assistant returned an empty stream.");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
          } catch {
            continue;
          }
          // A late stream from a previous conversation is discarded.
          if (token !== turnToken.current) continue;

          if (event.type === "status" && typeof event.state === "string")
            setState(event.state);
          else if (event.type === "tool_status") {
            const label = String(event.label ?? "");
            setToolNote(event.state === "running" ? label : "");
          } else if (event.type === "text_delta") {
            text += String(event.text ?? "");
            setTurns((t) =>
              t.map((x) => (x.id === answerId ? { ...x, content: text } : x)),
            );
          } else if (event.type === "done") {
            finished = true;
            text = String(event.text ?? text);
            setTurns((t) =>
              t.map((x) =>
                x.id === answerId
                  ? { ...x, content: text, state: "complete" }
                  : x,
              ),
            );
          } else if (event.type === "saved") {
            if (typeof event.conversationId === "string")
              setConversation(event.conversationId);
          } else if (event.type === "error") {
            throw new Error(String(event.message ?? "The assistant failed."));
          }
        }
      }

      if (token !== turnToken.current) return;

      if (!finished) throw new Error("The response ended before it completed.");
      setState("ready");
      if (voiceOut) speak(text);
      else setLastSpoken(text);
      void refreshHistory();
    } catch (e) {
      if (token !== turnToken.current) return;
      const aborted = e instanceof DOMException && e.name === "AbortError";
      if (!aborted) {
        setError(e instanceof Error ? e.message : "The assistant failed.");
        setState("interrupted");
      }
      // A failed stream stays visibly interrupted and is not saved as success.
      setTurns((t) =>
        t.map((x) =>
          x.id === answerId && x.state === "streaming"
            ? { ...x, state: "interrupted" }
            : x,
        ),
      );
    } finally {
      if (token === turnToken.current) {
        setBusy(false);
        setToolNote("");
        abort.current = null;
      }
    }
  }

  async function refreshHistory() {
    try {
      const res = await fetch("/placement/assistant-api?assistant=friday");
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json"))
        return;
      const body: unknown = await res.json();
      const rows = (body as { data?: { rows?: Row[] } })?.data?.rows;
      if (Array.isArray(rows)) setHistory(rows);
    } catch {
      // History refresh is best effort; the answer is already on screen.
    }
  }

  async function open(id: string) {
    turnToken.current++;
    abort.current?.abort();
    stopAudio();
    setError("");
    setBusy(false);
    setState("ready");
    try {
      const res = await fetch(
        `/placement/assistant-api?assistant=friday&id=${encodeURIComponent(id)}`,
      );
      if (!res.ok) throw new Error("That conversation could not be opened.");
      const body: unknown = await res.json();
      const messages = (body as { data?: { messages?: Row[] } })?.data?.messages;
      setTurns(
        (Array.isArray(messages) ? messages : []).map((m) => ({
          id: crypto.randomUUID(),
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content ?? ""),
          state: "complete" as const,
        })),
      );
      setConversation(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That conversation could not be opened.");
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch("/placement/assistant-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          operation: "delete",
          id,
        }),
      });
      if (!res.ok) throw new Error("That conversation could not be deleted.");
      if (conversation === id) reset();
      void refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That conversation could not be deleted.");
    }
  }

  function reset() {
    turnToken.current++;
    abort.current?.abort();
    stopAudio();
    releaseMic();
    setTurns([]);
    setConversation(undefined);
    setDraft("");
    setError("");
    setToolNote("");
    setState("ready");
    setBusy(false);
    setLastSpoken("");
  }

  const activeLabel = toolNote || STATE_LABEL[state] || STATE_LABEL.ready;

  return (
    <div className="po-chat po-friday">
      <section className="erp-panel po-chat-history">
        <div className="po-actions">
          <button type="button" className="erp-secondary" onClick={reset}>
            New conversation
          </button>
        </div>
        {history.length ? (
          <ul className="po-friday-history">
            {history.map((h) => (
              <li key={String(h.id)} className="po-history-row">
                <button
                  type="button"
                  className="po-friday-open"
                  aria-current={conversation === h.id ? "true" : undefined}
                  onClick={() => open(String(h.id))}
                >
                  {String(h.title ?? "Conversation")}
                </button>
                <button
                  type="button"
                  className="erp-secondary"
                  onClick={() => remove(String(h.id))}
                  aria-label={`Delete conversation ${String(h.title ?? "")}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="po-note">Your F.R.I.D.A.Y. conversations appear here.</p>
        )}
      </section>

      <section className="erp-panel po-friday-main">
        <div className="po-friday-statusbar">
          <p className="po-friday-state" role="status" aria-live="polite">
            {activeLabel}
          </p>
          <div className="po-actions">
            <label className="po-friday-toggle">
              <input
                type="checkbox"
                checked={voiceOut}
                disabled={!ttsAvailable}
                onChange={(e) => {
                  setVoiceOut(e.target.checked);
                  if (!e.target.checked) stopAudio();
                }}
              />
              Speak replies
            </label>
            {speaking && (
              <button type="button" className="erp-secondary" onClick={stopAudio}>
                Stop speaking
              </button>
            )}
            {!speaking && lastSpoken && ttsAvailable && (
              <button
                type="button"
                className="erp-secondary"
                onClick={() => {
                  setVoiceOut(true);
                  speak(lastSpoken);
                }}
              >
                Replay answer
              </button>
            )}
          </div>
        </div>

        {!caps.chat && (
          <p className="erp-error">
            The assistant is not configured on this server. Set OPENROUTER_API_KEY
            to enable replies. Conversation history remains available.
          </p>
        )}
        {!ttsAvailable && (
          <p className="po-note">
            This browser does not offer speech output, so replies are text only.
          </p>
        )}

        <div className="po-chat-log" aria-live="polite" aria-busy={busy}>
          {turns.length === 0 && (
            <p className="po-note">
              Ask about a batch, a student, eligibility, drives or placement
              statistics. Answers use recorded campus data and name the records
              they came from.
            </p>
          )}
          {turns.map((t) => (
            <article
              key={t.id}
              className={t.role === "assistant" ? "po-assistant" : undefined}
            >
              <p className="erp-eyebrow">
                {t.role === "assistant" ? "F.R.I.D.A.Y." : "You"}
              </p>
              <p className="po-preserve">
                {t.content ||
                  (t.state === "streaming" ? "" : "No reply was received.")}
              </p>
              {t.state === "interrupted" && (
                <p className="erp-error">
                  This answer was interrupted and has not been saved.
                </p>
              )}
            </article>
          ))}
          <div ref={logEnd} />
        </div>

        {error && <p className="erp-error">{error}</p>}

        <form
          className="po-chat-compose"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft, false);
          }}
        >
          <label htmlFor="friday-input" className="po-friday-label">
            Ask F.R.I.D.A.Y.
          </label>
          <textarea
            id="friday-input"
            value={draft}
            maxLength={1000}
            rows={3}
            placeholder="Summarise the 2028 batch, or ask who is placement eligible in CSE."
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft, false);
              }
            }}
          />
          {listening && (
            <div className="po-friday-meter">
              <span
                className="po-friday-meter-fill"
                style={{ width: `${Math.round(level * 100)}%` }}
              />
              <span className="po-friday-meter-text">
                Microphone input level
              </span>
            </div>
          )}
          <div className="po-actions">
            <button
              type="submit"
              className="erp-primary"
              disabled={busy || !draft.trim()}
            >
              Send
            </button>
            {busy && (
              <button
                type="button"
                className="erp-secondary"
                onClick={stopGenerating}
              >
                Stop
              </button>
            )}
            {sttAvailable ? (
              listening ? (
                <button
                  type="button"
                  className="erp-secondary"
                  onClick={stopListening}
                >
                  Stop recording
                </button>
              ) : (
                <button
                  type="button"
                  className="erp-secondary"
                  onClick={() => void startListening()}
                  disabled={busy}
                >
                  Use microphone
                </button>
              )
            ) : (
              <span className="po-note">
                Speech input is unavailable in this browser.
              </span>
            )}
            {draft.trim() && !busy && (
              <button
                type="button"
                className="erp-secondary"
                onClick={() => void send(draft, true)}
              >
                Send and speak reply
              </button>
            )}
          </div>
          <p className="po-note">
            Review the transcript before sending. Speech output uses this
            browser&rsquo;s built-in voices, so the voice differs between devices
            and browsers.
          </p>
        </form>
      </section>
    </div>
  );
}
