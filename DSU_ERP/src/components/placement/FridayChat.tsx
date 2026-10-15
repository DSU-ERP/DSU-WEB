"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BriefcaseBusiness,
  ChartLine,
  Check,
  CircleAlert,
  Copy,
  CornerDownLeft,
  History as HistoryIcon,
  Info,
  Keyboard,
  Mic,
  Plus,
  Search,
  ShieldCheck,
  Square,
  Volume2,
} from "lucide-react";
import type { Row } from "@/lib/placement/types";
import { speakable, sentences } from "@/lib/friday/protocol";
import { formatDuration } from "@/lib/friday/view";
import { Answer } from "./friday/Answer";
import { History } from "./friday/History";

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  state: "streaming" | "complete" | "interrupted";
  at: number | null;
  durationMs?: number;
  tokens?: number | null;
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

const FOLLOW_UPS = [
  "Break this down by branch",
  "Show the top 20 students by CGPA",
  "Which drives are open right now?",
];

const BARS = 28;

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

const clock = (ms: number | null) =>
  ms === null
    ? ""
    : new Date(ms).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

function starters(batch: string | null) {
  const b = batch ? `Batch ${batch}` : "the current batch";
  return [
    {
      label: `Check placement eligibility for ${b}`,
      prompt: `How many students in ${b} are placement eligible, by branch?`,
      Icon: ShieldCheck,
    },
    {
      label: `Summarize the academic profile of ${b}`,
      prompt: `Summarize the academic profile of ${b}.`,
      Icon: ChartLine,
    },
    {
      label: "See scheduled recruitment drives",
      prompt: "Which placement drives are currently scheduled?",
      Icon: BriefcaseBusiness,
    },
    {
      label: "Find a student by name or USN",
      prompt: "Help me find a student by name or USN.",
      Icon: Search,
    },
  ];
}

export function FridayChat({
  initialHistory,
  initialCapabilities,
  focusBatch,
}: {
  initialHistory: Row[];
  initialCapabilities: Capabilities;
  focusBatch: string | null;
}) {
  const [history, setHistory] = useState(initialHistory);
  const [conversation, setConversation] = useState<string>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<string>("ready");
  const [toolNote, setToolNote] = useState("");
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceFlow, setVoiceFlow] = useState(false);
  const [inputLabel, setInputLabel] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState<string>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lastTokens, setLastTokens] = useState<number | null>(null);
  const caps = initialCapabilities;

  const abort = useRef<AbortController | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const media = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  const bars = useRef<HTMLSpanElement>(null);
  const elapsed = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  // Guards against a late stream landing in a different conversation.
  const turnToken = useRef(0);
  const logEnd = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLDivElement>(null);
  // Follow new text only while the officer is at the bottom, so reading an
  // earlier answer during a stream is never interrupted.
  const stick = useRef(true);
  const lastTop = useRef(0);

  // Speech support can only be known in the browser, so it is detected after
  // mount. Detecting it during render made the server HTML differ from the
  // first client render and caused a hydration error.
  const [speech, setSpeech] = useState<{ stt: boolean; tts: boolean } | null>(
    null,
  );
  useEffect(() => {
    setSpeech({ stt: !!recognitionCtor(), tts: "speechSynthesis" in window });
  }, []);
  const sttAvailable = speech?.stt ?? false;
  const ttsAvailable = speech?.tts ?? false;

  const stopAudio = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const releaseMic = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    recognition.current?.abort();
    recognition.current = null;
    media.current?.getTracks().forEach((t) => t.stop());
    media.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
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

  // Also re-run when busy flips, because the follow-up suggestions appear or
  // disappear then and change the height of the chat area.
  useEffect(() => {
    if (stick.current) logEnd.current?.scrollIntoView({ block: "end" });
  }, [turns, listening, busy]);

  /**
   * Speak an answer. `force` is used by Replay, which must work even when
   * automatic spoken replies are switched off. Reading the toggle from state
   * here was a bug: setVoiceOut(true) had not applied yet, so Replay did
   * nothing.
   */
  function speak(text: string, force = false) {
    if ((!voiceOut && !force) || !ttsAvailable) return;
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
        u.onend = () => {
          setSpeaking(false);
          setVoiceFlow(false);
        };
        u.onerror = () => setSpeaking(false);
      }
      window.speechSynthesis.speak(u);
    });
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
    // The microphone must never pick up the assistant's own playback.
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
    setInputLabel(stream.getAudioTracks()[0]?.label ?? "");

    const started = performance.now();
    // The level bars and the timer are written straight to the DOM from the
    // real input signal, so they cost no React renders and show nothing that
    // the microphone did not actually hear.
    try {
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const freq = new Uint8Array(analyser.frequencyBinCount);
      let shownSecond = -1;
      const tick = () => {
        analyser.getByteFrequencyData(freq);
        const spans = bars.current?.children;
        if (spans) {
          // Speech energy sits in the lower bins; spread them across the bars.
          const usable = Math.floor(freq.length * 0.6);
          for (let b = 0; b < spans.length; b++) {
            const from = Math.floor((b / spans.length) * usable);
            const to = Math.max(
              from + 1,
              Math.floor(((b + 1) / spans.length) * usable),
            );
            let sum = 0;
            for (let k = from; k < to; k++) sum += freq[k];
            const v = sum / (to - from) / 255;
            (spans[b] as HTMLElement).style.transform =
              `scaleY(${(0.06 + v * 0.94).toFixed(3)})`;
          }
        }
        const secs = Math.floor((performance.now() - started) / 1000);
        if (secs !== shownSecond && elapsed.current) {
          shownSecond = secs;
          elapsed.current.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
        }
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
      if (e.error !== "aborted")
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
      setState((s) =>
        s === "transcribing" || s === "listening" ? "ready" : s,
      );
      // The transcript stays in the box for review; nothing is sent until the
      // officer chooses to send it.
      input.current?.focus();
    };
    recognition.current = rec;
    setVoiceFlow(true);
    setListening(true);
    setState("listening");
    rec.start();
  }

  function stopListening() {
    recognition.current?.stop();
    releaseMic();
    setState("ready");
  }

  const cancelListening = useCallback(() => {
    releaseMic();
    setDraft("");
    setVoiceFlow(false);
    setState("ready");
  }, [releaseMic]);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelListening();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, cancelListening]);

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

  function patchTurn(id: string, patch: (t: Turn) => Turn) {
    setTurns((all) => all.map((x) => (x.id === id ? patch(x) : x)));
  }

  async function send(question: string) {
    if (!question.trim() || busy || listening) return;
    if (!caps.chat) {
      setError(
        "The assistant is not configured on this server. Ask an administrator to set OPENROUTER_API_KEY.",
      );
      return;
    }
    const spoken = voiceFlow;
    setError("");
    setToolNote("");
    setAnnounce("");
    stopAudio();
    const token = ++turnToken.current;
    const conversationAtSend = conversation;
    const answerId = crypto.randomUUID();
    const sentAt = Date.now();
    const t0 = performance.now();
    // Context is the conversation as it stands on screen, so the assistant
    // remembers earlier turns immediately rather than only after a save.
    const context = turns
      .filter((t) => t.state === "complete" && t.content.trim())
      .map((t) => ({ role: t.role, content: t.content }));

    setTurns((t) => [
      ...t,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        state: "complete",
        at: sentAt,
      },
      {
        id: answerId,
        role: "assistant",
        content: "",
        state: "streaming",
        at: null,
      },
    ]);
    setDraft("");
    setBusy(true);
    setState("preparing");
    stick.current = true;

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
          history: context,
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
            setToolNote(
              event.state === "running" ? String(event.label ?? "") : "",
            );
          } else if (event.type === "usage") {
            const u = event.usage as { totalTokens?: unknown } | undefined;
            const total =
              typeof u?.totalTokens === "number" ? u.totalTokens : null;
            setLastTokens(total);
            patchTurn(answerId, (t) => ({ ...t, tokens: total }));
          } else if (event.type === "text_delta") {
            text += String(event.text ?? "");
            patchTurn(answerId, (t) => ({ ...t, content: text }));
          } else if (event.type === "done") {
            finished = true;
            text = String(event.text ?? text);
            const durationMs = performance.now() - t0;
            patchTurn(answerId, (t) => ({
              ...t,
              content: text,
              state: "complete",
              at: Date.now(),
              durationMs,
            }));
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
      setAnnounce("F.R.I.D.A.Y. has replied.");
      if (voiceOut && ttsAvailable) speak(text);
      else setVoiceFlow(false);
      void refreshHistory();
    } catch (e) {
      if (token !== turnToken.current) return;
      const aborted = e instanceof DOMException && e.name === "AbortError";
      if (!aborted) {
        const message =
          e instanceof Error ? e.message : "The assistant failed.";
        setError(message);
        setAnnounce(message);
        setState("interrupted");
      }
      setVoiceFlow(false);
      // A failed stream stays visibly interrupted and is not saved as success.
      patchTurn(answerId, (t) =>
        t.state === "streaming" ? { ...t, state: "interrupted" } : t,
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
    releaseMic();
    setVoiceFlow(false);
    setError("");
    setBusy(false);
    setState("ready");
    setLastTokens(null);
    try {
      const res = await fetch(
        `/placement/assistant-api?assistant=friday&id=${encodeURIComponent(id)}`,
      );
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json"))
        throw new Error("That conversation could not be opened.");
      const body: unknown = await res.json();
      const messages = (body as { data?: { messages?: Row[] } })?.data
        ?.messages;
      setTurns(
        (Array.isArray(messages) ? messages : []).map((m) => {
          const at =
            typeof m.created_at === "string" ? Date.parse(m.created_at) : NaN;
          return {
            id: crypto.randomUUID(),
            role:
              m.role === "assistant"
                ? ("assistant" as const)
                : ("user" as const),
            content: String(m.content ?? ""),
            state: "complete" as const,
            at: Number.isNaN(at) ? null : at,
          };
        }),
      );
      setConversation(id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "That conversation could not be opened.",
      );
    }
  }

  /** Throws on failure so the confirmation dialog can show the reason. */
  async function remove(id: string) {
    const res = await fetch("/placement/assistant-api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        operation: "delete",
        id,
      }),
    });
    if (!res.ok) {
      let message = "That conversation could not be deleted.";
      if ((res.headers.get("content-type") ?? "").includes("json")) {
        const body: unknown = await res.json().catch(() => null);
        if (
          body &&
          typeof body === "object" &&
          typeof (body as { error?: unknown }).error === "string"
        )
          message = (body as { error: string }).error;
      }
      throw new Error(message);
    }
    setHistory((h) => h.filter((c) => String(c.id) !== id));
    if (conversation === id) reset();
    void refreshHistory();
  }

  function reset() {
    turnToken.current++;
    abort.current?.abort();
    stopAudio();
    releaseMic();
    setVoiceFlow(false);
    setTurns([]);
    setConversation(undefined);
    setDraft("");
    setError("");
    setToolNote("");
    setState("ready");
    setBusy(false);
    setLastTokens(null);
    input.current?.focus();
  }

  async function copy(t: Turn) {
    try {
      await navigator.clipboard.writeText(t.content);
      setCopied(t.id);
      setTimeout(() => setCopied((c) => (c === t.id ? undefined : c)), 2000);
    } catch {
      setError(
        "Copying was blocked by the browser. Select the text and copy it instead.",
      );
    }
  }

  const activeLabel = speaking
    ? STATE_LABEL.speaking
    : toolNote || STATE_LABEL[state] || STATE_LABEL.ready;
  const tone =
    state === "interrupted"
      ? "error"
      : busy || listening || speaking
        ? "active"
        : "ready";
  const title = history.find((h) => String(h.id) === conversation)?.title;
  const lastAssistant = [...turns]
    .reverse()
    .find((t) => t.role === "assistant");
  const showFollowUps =
    !busy && !listening && lastAssistant?.state === "complete";

  // The voice sequence is only drawn while a spoken question is in progress,
  // and a step is only marked current while that operation is actually
  // running. Between recording and sending, nothing is running: steps 1 and 2
  // are done and the officer is reviewing the transcript.
  const reviewing = voiceFlow && !listening && !busy && !speaking;
  const voiceStep = !voiceFlow
    ? 0
    : speaking
      ? 4
      : busy
        ? 3
        : reviewing
          ? 2.5
          : state === "transcribing"
            ? 2
            : 1;

  const speakToggle = (className: string) => (
    <label className={`fr-toggle ${className}`}>
      <input
        type="checkbox"
        checked={voiceOut}
        disabled={!ttsAvailable}
        onChange={(e) => {
          setVoiceOut(e.target.checked);
          if (!e.target.checked) stopAudio();
        }}
      />
      <span>Speak replies</span>
    </label>
  );

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const stepsEl = voiceStep > 0 && (
    <ol className="fr-steps" aria-label="Voice question progress">
      {["Listening", "Transcribing", "Processing request", "Speaking"].map(
        (label, i) => {
          const n = i + 1;
          const status =
            n < voiceStep ? "done" : n === voiceStep ? "current" : "next";
          return (
            <li
              key={label}
              className={`is-${status}`}
              aria-current={status === "current" ? "step" : undefined}
            >
              {n}. {label}
              {n < 4 && <span aria-hidden="true"> →</span>}
            </li>
          );
        },
      )}
      <li className="fr-steps-end">
        <Volume2 size={13} aria-hidden="true" />
        {voiceOut ? "Spoken reply on" : "Spoken reply off"}
      </li>
    </ol>
  );

  const errorEl = error && (
    <p className="fr-notice fr-notice--error" role="alert">
      <CircleAlert size={15} aria-hidden="true" />
      {error}
    </p>
  );

  const liveEl = listening && (
    <article className="fr-live" aria-label="Live transcription">
      <p className="fr-turn-meta">
        <span className="fr-live-tag">
          <span className="fr-marker" aria-hidden="true" />
          Live transcription
        </span>
        <span>Placement officer</span>
      </p>
      <p className="fr-live-text">
        <Mic size={16} aria-hidden="true" />
        <span>
          {draft || (
            <span className="fr-live-wait">
              Start speaking. Your words appear here.
            </span>
          )}
          <span className="fr-caret" aria-hidden="true" />
        </span>
      </p>
    </article>
  );

  const recorderEl = (
    <div className="fr-recorder">
      <div className="fr-recorder-main">
        <span className="fr-recorder-state">
          <span className="fr-rec-dot" aria-hidden="true" />
          Listening
        </span>
        <span className="fr-recorder-meta">
          <span>
            {state === "transcribing"
              ? "Speech detected"
              : "Waiting for speech"}
          </span>
          <span>
            Recording <span ref={elapsed}>0:00</span>
          </span>
        </span>
        <span className="fr-bars" ref={bars} aria-hidden="true">
          {Array.from({ length: BARS }, (_, i) => (
            <span key={i} />
          ))}
        </span>
        <span className="fr-recorder-actions">
          <button
            type="button"
            className="fr-btn fr-btn--record"
            onClick={stopListening}
          >
            <Square size={13} aria-hidden="true" />
            Stop recording
          </button>
          <button
            type="button"
            className="fr-btn fr-btn--outline"
            onClick={cancelListening}
          >
            Cancel
          </button>
        </span>
      </div>
      <p className="fr-recorder-note">
        <Keyboard size={14} aria-hidden="true" />
        Typing is paused while the microphone is recording.
        <kbd>Esc</kbd> to cancel
        {inputLabel && (
          <span className="fr-recorder-device">Input: {inputLabel}</span>
        )}
      </p>
    </div>
  );

  // The welcome screen uses a compact one-row input centred under the
  // question; in a conversation the full composer sits at the bottom.
  const composerEl = (hero: boolean) => (
    <form
      className={`fr-composer${hero ? " fr-composer--hero" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        void send(draft);
      }}
    >
      {!hero && (
        <div className="fr-composer-status">
          <span className={`fr-state fr-state--${tone}`} role="status">
            <span className="fr-state-dot" aria-hidden="true" />
            {activeLabel}
          </span>
          {speaking ? (
            <button type="button" className="fr-link-btn" onClick={stopAudio}>
              <Square size={12} aria-hidden="true" />
              Stop speaking
            </button>
          ) : (
            voiceOut && (
              <span className="fr-composer-fact">
                <Volume2 size={13} aria-hidden="true" />
                Speak replies on
              </span>
            )
          )}
          {lastTokens !== null && (
            <span className="fr-composer-fact fr-hide-narrow">
              Last reply {lastTokens.toLocaleString("en-IN")} tokens
            </span>
          )}
          <span className="fr-composer-fact fr-composer-model fr-hide-narrow">
            Model {caps.model}
          </span>
        </div>
      )}
      <label htmlFor="friday-input" className="fr-sr">
        Ask F.R.I.D.A.Y.
      </label>
      <textarea
        id="friday-input"
        ref={input}
        value={draft}
        maxLength={1000}
        rows={hero ? 1 : 2}
        placeholder={
          hero
            ? "Ask F.R.I.D.A.Y."
            : "Ask a follow-up, break it down by branch, or list students."
        }
        onChange={(e) => {
          setDraft(e.target.value);
          if (hero) grow(e.currentTarget);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send(draft);
          }
        }}
      />
      <div className="fr-composer-foot">
        {!hero && speakToggle("fr-show-narrow")}
        {!hero && (
          <span className="fr-hint fr-hide-narrow">
            <CornerDownLeft size={13} aria-hidden="true" />
            Enter to send, Shift + Enter for a new line
          </span>
        )}
        <span className="fr-composer-buttons">
          {(sttAvailable || !speech) && (
            <button
              type="button"
              className={`fr-btn fr-btn--outline${hero ? " fr-btn--icon" : ""}`}
              onClick={() => void startListening()}
              disabled={busy || !speech}
              title={hero ? "Voice input" : undefined}
            >
              <Mic size={hero ? 17 : 15} aria-hidden="true" />
              {hero ? (
                <span className="fr-sr">Voice input</span>
              ) : (
                <>
                  <span className="fr-hide-narrow">Voice input</span>
                  <span className="fr-show-narrow fr-sr">Voice input</span>
                </>
              )}
            </button>
          )}
          {busy ? (
            <button
              type="button"
              className="fr-btn fr-btn--outline"
              onClick={stopGenerating}
            >
              <Square size={13} aria-hidden="true" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              className={`fr-btn fr-btn--primary${hero ? " fr-btn--icon" : ""}`}
              disabled={!draft.trim()}
              title={hero ? "Send" : undefined}
            >
              {hero ? (
                <span className="fr-sr">Send</span>
              ) : (
                <>
                  <span className="fr-hide-narrow">Send</span>
                  <span className="fr-show-narrow fr-sr">Send</span>
                </>
              )}
              <ArrowUp size={hero ? 17 : 15} aria-hidden="true" />
            </button>
          )}
        </span>
      </div>
      {voiceFlow && !listening && !busy && draft && (
        <p className="fr-review">
          Check the transcript, edit anything misheard, then send.
        </p>
      )}
    </form>
  );

  return (
    <div className="fr">
      <header className="fr-bar">
        {/* The name lives in the bar so it stays visible in every state
            without taking height away from the conversation. */}
        <h1 className="fr-bar-name">F.R.I.D.A.Y.</h1>
        <div className="fr-bar-actions">
          {speakToggle("fr-hide-narrow")}
          <button
            type="button"
            className="fr-btn fr-btn--outline fr-btn--quiet"
            onClick={() => setHistoryOpen(true)}
            aria-haspopup="dialog"
          >
            <HistoryIcon size={15} aria-hidden="true" />
            <span className="fr-hide-narrow">Conversations</span>
            <span className="fr-count" aria-label={`${history.length} saved`}>
              {history.length}
            </span>
          </button>
          <button
            type="button"
            className="fr-btn fr-btn--primary"
            onClick={reset}
          >
            <Plus size={15} aria-hidden="true" />
            <span className="fr-hide-narrow">New conversation</span>
            <span className="fr-show-narrow fr-sr">New conversation</span>
          </button>
        </div>
      </header>

      <div className="fr-column">
        {turns.length > 0 && (
          <div className="fr-strip">
            <span className="fr-strip-item fr-strip-strong">
              <span className="fr-marker" aria-hidden="true" />
              {String(title ?? "Current conversation")}
            </span>
            <span className="fr-strip-item">
              {turns.length} {turns.length === 1 ? "message" : "messages"}
            </span>
            <span className="fr-strip-item fr-strip-end">
              <ShieldCheck size={13} aria-hidden="true" /> Placement officer
              session
            </span>
          </div>
        )}

        {!caps.chat && (
          <p className="fr-notice fr-notice--error" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            The assistant is not configured on this server. Set
            OPENROUTER_API_KEY to enable replies. Saved conversations can still
            be opened.
          </p>
        )}

        <div
          className="fr-main"
          ref={main}
          onScroll={() => {
            const m = main.current;
            if (!m) return;
            // Content growing never moves scrollTop, so it cannot turn
            // following off; only the officer scrolling up does. Returning
            // to the bottom turns it back on.
            const atBottom = m.scrollHeight - m.scrollTop - m.clientHeight < 80;
            if (atBottom) stick.current = true;
            else if (m.scrollTop < lastTop.current) stick.current = false;
            lastTop.current = m.scrollTop;
          }}
        >
          <div className="fr-main-inner">
            {turns.length === 0 ? (
              <section
                className="fr-welcome"
                aria-labelledby="fr-welcome-title"
              >
                <h2 id="fr-welcome-title">What would you like to know?</h2>
                {liveEl}
                {stepsEl}
                {errorEl}
                {listening ? recorderEl : composerEl(true)}
                {!listening && (
                  <ul className="fr-starters" aria-label="Suggested questions">
                    {starters(focusBatch).map(({ label, prompt, Icon }) => (
                      <li key={label}>
                        <button
                          type="button"
                          className="fr-starter"
                          onClick={() => void send(prompt)}
                          disabled={busy || !caps.chat}
                        >
                          <Icon size={18} aria-hidden="true" />
                          <span>{label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {speakToggle("fr-show-narrow fr-hero-toggle")}
              </section>
            ) : (
              <div className="fr-log">
                {turns.map((t) =>
                  t.role === "user" ? (
                    <article
                      key={t.id}
                      className="fr-turn fr-turn--user"
                      aria-label="Your question"
                    >
                      <p className="fr-turn-meta">
                        <span className="fr-turn-who">You</span>
                        {t.at !== null && <time>{clock(t.at)}</time>}
                      </p>
                      <div className="fr-question">{t.content}</div>
                    </article>
                  ) : (
                    <article
                      key={t.id}
                      className="fr-turn fr-turn--assistant"
                      aria-label="F.R.I.D.A.Y. reply"
                    >
                      <p className="fr-turn-meta">
                        <span className="fr-turn-who">
                          <span className="fr-marker" aria-hidden="true" />
                          F.R.I.D.A.Y.
                        </span>
                        <span className="fr-turn-role">
                          Campus records assistant
                        </span>
                        <span className="fr-turn-facts">
                          {t.at !== null && <time>{clock(t.at)}</time>}
                          {t.durationMs !== undefined && (
                            <span>
                              Answered in {formatDuration(t.durationMs)}
                            </span>
                          )}
                        </span>
                      </p>
                      <div className="fr-reply">
                        {t.content ? (
                          <Answer text={t.content} />
                        ) : t.state === "streaming" ? (
                          <p className="fr-pending">
                            {toolNote ||
                              STATE_LABEL[state] ||
                              "Preparing answer"}
                          </p>
                        ) : (
                          <p className="fr-pending">No reply was received.</p>
                        )}
                        {t.state === "streaming" && t.content && (
                          <span className="fr-caret" aria-hidden="true" />
                        )}

                        {t.state === "interrupted" && (
                          <p className="fr-notice fr-notice--error">
                            <CircleAlert size={15} aria-hidden="true" />
                            This answer was interrupted and has not been saved.
                          </p>
                        )}

                        {t.state === "complete" && t.content && (
                          <div className="fr-turn-actions">
                            <button
                              type="button"
                              className="fr-btn fr-btn--outline fr-btn--small"
                              onClick={() => void copy(t)}
                            >
                              {copied === t.id ? (
                                <Check size={14} aria-hidden="true" />
                              ) : (
                                <Copy size={14} aria-hidden="true" />
                              )}
                              {copied === t.id ? "Copied" : "Copy text"}
                            </button>
                            {ttsAvailable && (
                              <button
                                type="button"
                                className="fr-btn fr-btn--outline fr-btn--small"
                                onClick={() => speak(t.content, true)}
                                disabled={listening}
                              >
                                <Volume2 size={14} aria-hidden="true" />
                                Replay answer
                              </button>
                            )}
                            {t.tokens != null && (
                              <span className="fr-turn-tokens">
                                {t.tokens.toLocaleString("en-IN")} tokens
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}

            {turns.length > 0 && liveEl}
            <div ref={logEnd} />
          </div>
        </div>

        {turns.length > 0 && (
          <div className="fr-dock fr-dock--sticky">
            {stepsEl}
            {errorEl}
            {showFollowUps && (
              <div className="fr-followups">
                <span>Follow up</span>
                {FOLLOW_UPS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="fr-chip"
                    onClick={() => void send(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
            {listening ? recorderEl : composerEl(false)}
          </div>
        )}

        <footer className="fr-foot">
          <p>
            <Info size={13} aria-hidden="true" />
            Responses use campus data available to your account.
          </p>
          {speech && (
            <p className="fr-foot-end">
              {sttAvailable
                ? "Speech recognition: browser, en-IN"
                : "Speech input unavailable in this browser"}
              {!ttsAvailable && " · Speech output unavailable"}
            </p>
          )}
        </footer>

        <p className="fr-sr" aria-live="polite">
          {announce}
        </p>
      </div>

      <History
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={history}
        activeId={conversation}
        onOpen={(id) => void open(id)}
        onNew={reset}
        onDelete={remove}
      />
    </div>
  );
}
