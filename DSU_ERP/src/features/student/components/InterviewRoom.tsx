"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  Video,
  MonitorUp,
  Expand,
  ShieldCheck,
  Volume2,
  Sparkles,
  Square,
  Check,
  RotateCcw,
} from "lucide-react";
import { studentFetch } from "../lib/client";
import { plural, wordCount } from "../lib/progress";
import { useSpeechInput } from "../lib/useSpeech";
import {
  depositMedia,
  takeMedia,
  stopMedia,
  hasLiveInterviewMedia,
  type InterviewMedia,
} from "../lib/media";
import type {
  InterviewPlanDetail,
  InterviewSession,
  InterviewAnswer,
  AnswerFeedback,
} from "../lib/interview-types";
import {
  PageTitle,
  Panel,
  Metric,
  Empty,
  ErrorNote,
  Progress,
  DateLabel,
} from "./UI";
export function InterviewPreflight({
  mode,
  title,
  minutes,
  onReady,
}: {
  mode: "mock" | "proctored";
  title: string;
  minutes: number;
  onReady: (media: InterviewMedia) => Promise<void>;
}) {
  const [media, setMedia] = useState<InterviewMedia>({
      camera: null,
      screen: null,
    }),
    [fullscreen, setFullscreen] = useState(false),
    [accepted, setAccepted] = useState(false),
    [speechAvailable, setSpeechAvailable] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const saved = useRef(media),
    transferred = useRef(false);
  saved.current = media;
  useEffect(() => {
    const browser = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    setSpeechAvailable(
      !!(browser.SpeechRecognition || browser.webkitSpeechRecognition) &&
        "speechSynthesis" in window,
    );
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    change();
    return () => {
      document.removeEventListener("fullscreenchange", change);
      if (!transferred.current) stopMedia(saved.current);
    };
  }, []);
  useEffect(() => {
    const ended = () => setMedia((current) => ({ ...current }));
    const tracks = [
      ...(media.camera?.getTracks() || []),
      ...(media.screen?.getTracks() || []),
    ];
    tracks.forEach((track) => track.addEventListener("ended", ended));
    return () =>
      tracks.forEach((track) => track.removeEventListener("ended", ended));
  }, [media.camera, media.screen]);
  const camera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      saved.current.camera?.getTracks().forEach((track) => track.stop());
      setMedia((current) => ({ ...current, camera: stream }));
    } catch {
      setError(
        "Camera and microphone access are required for the proctored session. Check permissions and try again, or use mock mode.",
      );
    }
  };
  const screen = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });
      if (
        stream.getVideoTracks()[0].getSettings().displaySurface !== "monitor"
      ) {
        stream.getTracks().forEach((track) => track.stop());
        throw Error();
      }
      saved.current.screen?.getTracks().forEach((track) => track.stop());
      setMedia((current) => ({ ...current, screen: stream }));
    } catch {
      setError(
        "Choose your entire screen in the sharing prompt. A window or tab does not meet this session’s requirements.",
      );
    }
  };
  const expand = async () => {
    setError("");
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setError(
        "Fullscreen access is required. Use a supported browser and try again.",
      );
    }
  };
  const ready =
    mode === "mock" ||
    (hasLiveInterviewMedia(media) && fullscreen && speechAvailable);
  const begin = async () => {
    if (
      !accepted ||
      (mode === "proctored" &&
        (!hasLiveInterviewMedia(media) ||
          !document.fullscreenElement ||
          !speechAvailable))
    ) {
      setError(
        "Confirm consent and restore camera, microphone, screen sharing and fullscreen before continuing.",
      );
      return;
    }
    setBusy(true);
    setError("");
    // Mark the streams as handed over before onReady: it can unmount this
    // preflight synchronously, and the cleanup must not stop them.
    transferred.current = true;
    try {
      await onReady(media);
    } catch (e) {
      transferred.current = false;
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <section className="st-preflight">
      <div className="st-preflight-story">
        <span className="st-tag">
          {mode === "mock" ? "COACHED PRACTICE" : "PROCTORED AI SESSION"}
        </span>
        <h1>{title}</h1>
        <p>
          {mode === "mock"
            ? "A focused conversation. A useful reflection. Another step forward."
            : "A quieter assessment space, with your feedback held until completion."}
        </p>
        <div className="st-actions">
          <span>{plural(minutes, "minute")}</span>
          <span>
            {mode === "mock" ? "Typed or spoken answers" : "Spoken answers"}
          </span>
          <span>AI interviewer</span>
        </div>
        <div className="st-ai-orbit">
          <Sparkles size={38} />
        </div>
        <p className="st-muted">
          Maya is a synthetic AI interviewer, not a live human recruiter.
        </p>
      </div>
      <div className="st-preflight-checklist">
        <h2>Before you begin.</h2>
        {mode === "proctored" ? (
          <>
            <p className="st-muted">
              Grant each permission yourself. Question text, transcripts and
              scores are hidden during the active session. Three recorded
              browser integrity warnings end the session.
            </p>
            <div className="st-access-checks">
              <button
                onClick={() => void camera()}
                disabled={
                  !!media.camera
                    ?.getVideoTracks()
                    .some((track) => track.readyState === "live") &&
                  !!media.camera
                    ?.getAudioTracks()
                    .some((track) => track.readyState === "live")
                }
              >
                <Video size={18} />
                <span>Camera & microphone</span>
                {media.camera
                  ?.getVideoTracks()
                  .some((track) => track.readyState === "live") &&
                media.camera
                  ?.getAudioTracks()
                  .some((track) => track.readyState === "live") ? (
                  <Check size={17} />
                ) : (
                  "Enable"
                )}
              </button>
              <button
                onClick={() => void screen()}
                disabled={!!media.screen?.active}
              >
                <MonitorUp size={18} />
                <span>Entire-screen sharing</span>
                {media.screen?.active ? <Check size={17} /> : "Share"}
              </button>
              <button onClick={() => void expand()} disabled={fullscreen}>
                <Expand size={18} />
                <span>Fullscreen workspace</span>
                {fullscreen ? <Check size={17} /> : "Enter"}
              </button>
            </div>
            {!speechAvailable && (
              <p className="st-error">
                This browser does not provide the speech input/output needed for
                this mode. Use a supported browser or choose mock mode.
              </p>
            )}
            <p className="st-muted">
              Camera and screen access support browser integrity checks. Media
              is not uploaded or recorded by this application. These checks do
              not provide face recognition, identity verification or
              browser-extension control.
            </p>
          </>
        ) : (
          <>
            <ul className="st-bullets">
              <li>See each question and choose whether to type or speak.</li>
              <li>
                Listen to Maya and use speech capture where your browser
                supports it.
              </li>
              <li>
                Review immediate rubric feedback and retry an answer once.
              </li>
              <li>The original countdown continues if you leave or reload.</li>
            </ul>
            <p className="st-muted">
              Mock mode is not proctored. Camera and fullscreen access are
              optional.
            </p>
          </>
        )}
        <label className="st-consent">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          I understand the mode, timer and use of my answers for AI evaluation.
        </label>
        <ErrorNote message={error} />
        <button
          className="st-button"
          disabled={!ready || !accepted || busy}
          onClick={() => void begin()}
        >
          {busy
            ? "Opening your session…"
            : mode === "mock"
              ? "Begin mock interview ↗"
              : "Begin proctored AI interview ↗"}
        </button>
        <Link className="st-muted" href="/student/interview?view=library">
          ← Back to interview library
        </Link>
      </div>
    </section>
  );
}
export function InterviewPlanView({ plan }: { plan: InterviewPlanDetail }) {
  const router = useRouter();
  const [mode, setMode] = useState<"mock" | "proctored" | null>(null);
  const begin = async (media: InterviewMedia) => {
    const result = await studentFetch<{ id: string }>(
      `interviews/${plan.id}/sessions`,
      { method: "POST", body: { mode, accepted: true } },
    );
    depositMedia(result.id, media);
    router.push(`/student/interview/session/${result.id}`);
  };
  if (mode)
    return (
      <InterviewPreflight
        mode={mode}
        title={plan.title}
        minutes={plan.config.durationMinutes}
        onReady={begin}
      />
    );
  const completed = plan.sessions.filter(
      (session) => session.status === "completed",
    ),
    scores = completed
      .map((session) => session.report?.scores.overall)
      .filter((value): value is number => value != null),
    average = scores.length
      ? Math.round(
          (scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10,
        ) / 10
      : null;
  return (
    <>
      <PageTitle
        eyebrow="DSU / AI INTERVIEW"
        title={plan.title}
        description={plan.goal}
        action={
          <Link
            className="st-button st-button-secondary"
            href="/student/interview?view=library"
          >
            ← Interview library
          </Link>
        }
      />
      <div className="st-metrics">
        <Metric label="Completed sessions" value={completed.length} />
        <Metric label="Planned questions" value={plan.questions.length} />
        <Metric
          label="Session duration"
          value={`${plan.config.durationMinutes} min`}
        />
        <Metric
          label="Average rubric score"
          value={average === null ? "Not measured" : `${average}/10`}
        />
      </div>
      <div className="st-two-col">
        <Panel
          title={
            completed.length
              ? "Build on your experience."
              : "Your plan is ready. Your first attempt is ahead."
          }
        >
          <span className="st-tag">
            {completed.length
              ? "PRACTICE HISTORY AVAILABLE"
              : "INTERVIEW PLAN · NO COMPLETED ATTEMPT"}
          </span>
          <p className="st-muted" style={{ margin: "18px 0" }}>
            {plan.jd || "This interview is tailored to the goal you provided."}
          </p>
          <div className="st-actions">
            <button className="st-button" onClick={() => setMode("mock")}>
              <Mic size={15} />
              Start mock
            </button>
            <button
              className="st-button st-button-secondary"
              onClick={() => setMode("proctored")}
            >
              <ShieldCheck size={15} />
              Start proctored AI
            </button>
          </div>
        </Panel>
        <Panel title="Interview context">
          <dl className="st-details">
            {[
              ["Company", plan.config.company],
              ["Role", plan.config.role],
              ["Language", plan.config.language],
              ["Tone", plan.config.tone],
              ["Follow-up depth", plan.config.depth],
              ["Keywords", plan.config.keywords?.join(", ")],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "Not supplied"}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <Panel title="Your session history">
        {plan.sessions.length ? (
          plan.sessions.map((session) => (
            <Link
              className="st-list-row"
              key={session.id}
              href={`/student/interview/session/${session.id}`}
            >
              <div>
                <p>
                  {session.mode === "mock" ? "Coached mock" : "Proctored AI"}
                </p>
                <small>
                  <DateLabel value={session.ended_at || session.started_at} />
                </small>
              </div>
              <span className="st-tag">
                {session.status} ·{" "}
                {session.report?.scores.overall == null
                  ? "Not scored"
                  : `${session.report.scores.overall}/10`}
              </span>
            </Link>
          ))
        ) : (
          <Empty title="Every first attempt is a starting point.">
            Choose a mode above. Your real session history will be saved here.
          </Empty>
        )}
      </Panel>
    </>
  );
}
export function InterviewRoom({ initial }: { initial: InterviewSession }) {
  const router = useRouter();
  const [session, setSession] = useState(initial),
    [media, setMedia] = useState<InterviewMedia | null>(null),
    [needsAccess, setNeedsAccess] = useState(false),
    [answer, setAnswer] = useState(""),
    [phase, setPhase] = useState("ready"),
    [voice, setVoice] = useState(initial.mode === "proctored"),
    [autoSend, setAutoSend] = useState(initial.mode === "proctored"),
    [remaining, setRemaining] = useState(
      Math.max(
        0,
        Math.ceil((Date.parse(initial.expires_at) - Date.now()) / 1000),
      ),
    ),
    [error, setError] = useState(""),
    [last, setLast] = useState<InterviewAnswer | null>(
      initial.answers?.at(-1) || null,
    ),
    [retrying, setRetrying] = useState(false),
    [lastQuestion, setLastQuestion] = useState(
      initial.answers?.at(-1)?.question || "",
    );
  const camera = useRef<HTMLVideoElement>(null),
    live = useRef(true),
    finishing = useRef(false),
    processing = useRef(false),
    text = useRef(""),
    spokenIndex = useRef(-2),
    phaseRef = useRef(phase),
    submitRef = useRef<() => void>(() => {}),
    currentMedia = useRef<InterviewMedia | null>(null);
  phaseRef.current = phase;
  currentMedia.current = media;
  const speech = useSpeechInput(
    (value) => {
      setAnswer(value);
      text.current = value;
    },
    session.config.language,
    () => {
      if (
        live.current &&
        phaseRef.current === "listening" &&
        autoSend &&
        text.current.trim().length >= 5
      )
        submitRef.current();
    },
  );
  useEffect(() => {
    live.current = true;
    const granted =
      currentMedia.current ||
      takeMedia(initial.id) ||
      (initial.mode === "mock" ? { camera: null, screen: null } : null);
    currentMedia.current = granted;
    setMedia(granted);
    setNeedsAccess(
      initial.mode === "proctored" &&
        (!hasLiveInterviewMedia(granted) || !document.fullscreenElement),
    );
    return () => {
      live.current = false;
      window.speechSynthesis?.cancel();
      setTimeout(() => {
        if (!live.current && currentMedia.current)
          stopMedia(currentMedia.current);
      }, 0);
    };
  }, [initial.id, initial.mode]);
  useEffect(() => {
    if (camera.current) camera.current.srcObject = media?.camera || null;
  }, [media]);
  const refresh = async () => {
    const data = await studentFetch<InterviewSession>(`sessions/${session.id}`);
    setSession(data);
    if (data.answers) setLast(data.answers.at(-1) || null);
    return data;
  };
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    live.current = false;
    speech.stop();
    window.speechSynthesis?.cancel();
    setPhase("finishing");
    try {
      await studentFetch(`sessions/${session.id}/finish`, {
        method: "POST",
        body: {},
      });
      if (media) stopMedia(media);
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => {});
      router.push(`/student/interview/report/${session.id}`);
    } catch (e) {
      setError((e as Error).message);
      finishing.current = false;
      live.current = true;
      setPhase("ready");
    }
  };
  useEffect(() => {
    if (session.status !== "active") {
      router.replace(`/student/interview/report/${session.id}`);
      return;
    }
    const timer = setInterval(
      () =>
        setRemaining(
          Math.max(
            0,
            Math.ceil((Date.parse(session.expires_at) - Date.now()) / 1000),
          ),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [session.expires_at, session.id, session.status, router]);
  useEffect(() => {
    if (!remaining && !processing.current) void finish();
  }, [remaining]);
  const speak = (force = false) => {
    if (
      !session.currentQuestion ||
      (!voice && !force) ||
      !("speechSynthesis" in window)
    )
      return;
    speech.stop();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      retrying ? lastQuestion : session.currentQuestion,
    );
    utterance.lang = session.config.language;
    utterance.rate = session.config.tone === "strict" ? 1.05 : 0.96;
    utterance.onstart = () => setPhase("speaking");
    utterance.onend = () => {
      if (!live.current || processing.current) return;
      setPhase("listening");
      speech.start();
    };
    utterance.onerror = () => {
      setPhase("ready");
      setError(
        "Speech output stopped. Replay the question or continue in mock mode.",
      );
    };
    window.speechSynthesis.speak(utterance);
  };
  useEffect(() => {
    if (
      !needsAccess &&
      session.status === "active" &&
      session.currentIndex >= 0 &&
      spokenIndex.current !== session.currentIndex &&
      voice &&
      media !== null
    ) {
      spokenIndex.current = session.currentIndex;
      const timer = setTimeout(() => speak(), 400);
      return () => clearTimeout(timer);
    }
  }, [session.currentIndex, needsAccess, voice, media]);
  useEffect(() => {
    if (session.mode !== "proctored" || needsAccess || !media) return;
    let lastEvent = 0;
    const record = (kind: string, detail = "") => {
      if (!live.current || finishing.current || Date.now() - lastEvent < 1800)
        return;
      lastEvent = Date.now();
      void studentFetch<{ warnings: number; ended: boolean }>(
        `sessions/${session.id}/integrity`,
        { method: "POST", body: { kind, detail } },
      )
        .then((result) => {
          setError(
            `Browser integrity warning ${result.warnings}/3: ${kind.replaceAll("-", " ")}.`,
          );
          if (result.ended) {
            live.current = false;
            if (media) stopMedia(media);
            router.push(`/student/interview/report/${session.id}`);
          }
        })
        .catch((e) => setError(e.message));
    };
    const hidden = () => {
        if (document.hidden) record("tab-hidden");
      },
      blur = () => record("focus-lost"),
      fullscreen = () => {
        if (!document.fullscreenElement) record("fullscreen-exit");
      },
      clipboard = (e: Event) => {
        e.preventDefault();
        record("clipboard");
      };
    const screenStopped = () => record("screen-stopped"),
      cameraStopped = () => record("camera-stopped");
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", blur);
    document.addEventListener("fullscreenchange", fullscreen);
    for (const name of ["copy", "cut", "paste"])
      document.addEventListener(name, clipboard);
    media.screen
      ?.getTracks()
      .forEach((track) => track.addEventListener("ended", screenStopped));
    media.camera
      ?.getTracks()
      .forEach((track) => track.addEventListener("ended", cameraStopped));
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", blur);
      document.removeEventListener("fullscreenchange", fullscreen);
      for (const name of ["copy", "cut", "paste"])
        document.removeEventListener(name, clipboard);
      media.screen
        ?.getTracks()
        .forEach((track) => track.removeEventListener("ended", screenStopped));
      media.camera
        ?.getTracks()
        .forEach((track) => track.removeEventListener("ended", cameraStopped));
    };
  }, [session.mode, session.id, needsAccess, media, router]);
  // Typed answers survive an accidental reload of the same question.
  const draftKey = `dsu-interview-draft:${session.id}:${retrying ? "retry" : session.currentIndex}`;
  const saveDraft = (value: string) => {
    try {
      if (value.trim()) sessionStorage.setItem(draftKey, value);
      else sessionStorage.removeItem(draftKey);
    } catch {}
  };
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved && !text.current.trim()) {
        setAnswer(saved);
        text.current = saved;
      }
    } catch {}
  }, [draftKey]);
  const submit = async () => {
    if (processing.current || !text.current.trim() || !remaining) return;
    processing.current = true;
    setPhase("evaluating");
    speech.stop();
    window.speechSynthesis?.cancel();
    setError("");
    const questionIndex =
      retrying && last ? last.question_index : session.currentIndex;
    const prompt = retrying ? lastQuestion : session.currentQuestion || "";
    try {
      await studentFetch(`sessions/${session.id}/answer`, {
        method: "POST",
        body: { questionIndex, answer: text.current.trim(), retry: retrying },
      });
      setLastQuestion(prompt);
      setAnswer("");
      text.current = "";
      saveDraft("");
      setRetrying(false);
      const updated = await refresh();
      if (
        (updated.currentIndex < 0 && session.mode === "proctored") ||
        Date.parse(updated.expires_at) <= Date.now()
      ) {
        processing.current = false;
        await finish();
        return;
      }
      setPhase("ready");
    } catch (e) {
      setError((e as Error).message);
      setPhase("ready");
    } finally {
      processing.current = false;
      if (Date.parse(session.expires_at) <= Date.now() && !finishing.current)
        void finish();
    }
  };
  submitRef.current = () => void submit();
  if (needsAccess)
    return (
      <InterviewPreflight
        mode="proctored"
        title={session.title}
        minutes={Math.ceil(remaining / 60)}
        onReady={async (granted) => {
          const previous = currentMedia.current;
          if (previous && previous !== granted) stopMedia(previous);
          setMedia(granted);
          setNeedsAccess(false);
          live.current = true;
        }}
      />
    );
  const proctored = session.mode === "proctored",
    time = `${Math.floor(remaining / 60)
      .toString()
      .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
  return (
    <section className={`st-interview-room${proctored ? " st-proctored" : ""}`}>
      <header>
        <div>
          <p className="st-eyebrow">
            {proctored ? "PROCTORED AI SESSION" : "COACHED MOCK INTERVIEW"}
          </p>
          <h1>{session.title}</h1>
        </div>
        <div className="st-actions">
          <span className="st-room-state">
            <i />
            {phase === "evaluating"
              ? "Evaluating your response"
              : speech.listening
                ? "Listening to you"
                : phase === "speaking"
                  ? "Speaking now"
                  : "Ready"}
          </span>
          <strong className="st-timer" suppressHydrationWarning>{time}</strong>
          <button
            className="st-button st-button-secondary"
            onClick={() => {
              if (window.confirm("End this session and open your report?"))
                void finish();
            }}
          >
            End interview
          </button>
        </div>
      </header>
      <div className="st-room-body">
        <main>
          <div
            className={`st-maya${phase === "speaking" ? " st-maya-speaking" : ""}`}
            aria-hidden="true"
          >
            <div>
              <Sparkles size={52} />
            </div>
            <i />
            <i />
            <i />
          </div>
          <p className="st-eyebrow">MAYA / AI INTERVIEWER</p>
          {proctored ? (
            <>
              <h2>Stay with the conversation.</h2>
              <p className="st-muted">
                Listen to the question and answer aloud. Your transcript and
                rubric feedback remain hidden until completion.
              </p>
              <button
                className="st-button st-button-secondary"
                disabled={processing.current}
                onClick={() => speak(true)}
              >
                <Volume2 size={16} />
                Hear the current question
              </button>
            </>
          ) : (
            <>
              <p className="st-tag">
                {retrying
                  ? "PRACTICE RETRY"
                  : `QUESTION ${session.currentIndex + 1} OF ${session.questionCount}`}
              </p>
              <h2>
                {retrying
                  ? lastQuestion
                  : session.currentQuestion ||
                    "Every planned answer is saved. Review your last feedback, then end the interview."}
              </h2>
              <button
                className="st-button st-button-secondary"
                onClick={() => {
                  setVoice(true);
                  speak(true);
                }}
              >
                <Volume2 size={15} />
                Replay question
              </button>
            </>
          )}
          <ErrorNote message={error || speech.error} />
        </main>
        <aside>
          {media?.camera ? (
            <video
              ref={camera}
              autoPlay
              muted
              playsInline
              className="st-camera-preview"
            />
          ) : (
            <div className="st-camera-off">
              <Video size={25} />
              <span>Camera off for mock practice</span>
            </div>
          )}
          <div className="st-room-progress">
            <span>{session.answeredCount} answers saved</span>
            <progress
              max={session.questionCount}
              value={session.answeredCount}
            />
          </div>
          {!proctored && (
            <>
              <div className="st-form">
                <label>
                  Your answer · type or speak
                  <textarea
                    rows={6}
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      text.current = e.target.value;
                      saveDraft(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (e.ctrlKey || e.metaKey) &&
                        answer.trim().length >= 5 &&
                        phase !== "evaluating"
                      ) {
                        e.preventDefault();
                        void submit();
                      }
                    }}
                    maxLength={12000}
                    disabled={phase === "evaluating"}
                    placeholder="Take a moment. Give a clear, specific answer."
                  />
                </label>
                <div className="st-answer-meta" aria-live="polite">
                  <span>
                    {plural(wordCount(answer), "word")}
                    {wordCount(answer) === 0
                      ? ""
                      : wordCount(answer) < 40
                        ? " · add a specific example"
                        : wordCount(answer) > 250
                          ? " · try to tighten this"
                          : " · good length"}
                  </span>
                  <span>
                    <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save
                  </span>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={voice}
                    onChange={(e) => setVoice(e.target.checked)}
                  />
                  Speak each question and begin listening
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={autoSend}
                    onChange={(e) => setAutoSend(e.target.checked)}
                  />
                  Submit spoken answers when listening ends
                </label>
              </div>
              <div className="st-actions">
                {speech.available && (
                  <button
                    className="st-button st-button-secondary"
                    disabled={phase === "evaluating"}
                    onClick={() => {
                      setPhase("listening");
                      speech.listening ? speech.stop() : speech.start();
                    }}
                  >
                    <Mic size={14} />
                    {speech.listening ? "Stop listening" : "Record answer"}
                  </button>
                )}
                <button
                  className="st-button"
                  disabled={
                    answer.trim().length < 5 ||
                    phase === "evaluating" ||
                    (!retrying && session.currentIndex < 0)
                  }
                  onClick={() => void submit()}
                >
                  {phase === "evaluating"
                    ? "Evaluating…"
                    : retrying
                      ? "Submit practice retry"
                      : "Save & continue →"}
                </button>
              </div>
              {last?.feedback?.scores && (
                <div className="st-live-coaching">
                  <p className="st-eyebrow">LATEST ANSWER / AI RUBRIC</p>
                  <div className="st-live-scores">
                    {Object.entries(last.feedback.scores).map(
                      ([key, value]) => (
                        <div key={key}>
                          <strong>{value}/10</strong>
                          <small>{key}</small>
                        </div>
                      ),
                    )}
                  </div>
                  <p className="st-muted">{last.feedback.explanation}</p>
                  {!last.retried && last.feedback.quality !== "Excellent" && (
                    <button
                      className="st-button st-button-secondary"
                      onClick={() => {
                        setRetrying(true);
                        setAnswer("");
                        text.current = "";
                      }}
                    >
                      Try again with feedback ↗
                    </button>
                  )}
                  {last.retried && last.original_feedback?.scores && (
                    <p className="st-muted">
                      Original: {last.original_feedback.scores.overall}/10 ·
                      Retry: {last.feedback.scores.overall}/10.{" "}
                      {last.feedback.improvements?.join(" ")}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          {proctored && (
            <div className="st-proctor-status">
              <ShieldCheck size={20} />
              <p>
                Camera, microphone and screen permissions were granted. Keep
                sharing active.
              </p>
              <small>
                Browser checks only. No face recognition or identity
                verification.
              </small>
              <button
                className="st-button st-button-secondary"
                onClick={() => {
                  setPhase("listening");
                  speech.start();
                }}
                disabled={phase === "evaluating"}
              >
                Start listening
              </button>
            </div>
          )}
        </aside>
      </div>
      <footer>
        <span>Leaving or reloading does not pause the server countdown.</span>
        <span>
          {session.config.language} · {session.config.durationMinutes} min ·{" "}
          {session.config.depth} follow-ups
        </span>
      </footer>
    </section>
  );
}
export function InterviewResults({ initial }: { initial: InterviewSession }) {
  const router = useRouter();
  const [selected, setSelected] = useState(0),
    [action, setAction] = useState("Improve My Answer"),
    [coaching, setCoaching] = useState<{
      title: string;
      explanation: string;
      points: string[];
      rewrite: string | null;
      why: string;
      nextTip: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const answers = initial.answers || [],
    report = initial.report;
  const coach = async (nextAction = action) => {
    if (!answers[selected]) return;
    setAction(nextAction);
    setBusy(true);
    setError("");
    try {
      setCoaching(
        await studentFetch(`sessions/${initial.id}/coach`, {
          method: "POST",
          body: {
            questionIndex: answers[selected].question_index,
            action: nextAction,
          },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (initial.status === "active")
    return (
      <Panel>
        <Empty
          title="Your conversation is still open."
          href={`/student/interview/session/${initial.id}`}
          label="Return to session"
        >
          Reports and answer coaching are available after the session ends.
        </Empty>
      </Panel>
    );
  return (
    <>
      <PageTitle
        title={
          initial.status === "terminated"
            ? "A session to reflect on."
            : "Your next improvement starts here."
        }
        description={initial.title}
        action={
          <Link
            className="st-button st-button-secondary"
            href="/student/interview?view=library"
          >
            Back to interviews ↗
          </Link>
        }
      />
      {initial.termination_reason && (
        <ErrorNote message={initial.termination_reason} />
      )}
      <div className="st-metrics">
        <Metric
          label="Overall AI rubric"
          value={
            report?.scores.overall == null
              ? "Not scored"
              : `${report.scores.overall}/10`
          }
        />
        <Metric
          label="Answers saved"
          value={report?.answered ?? answers.length}
        />
        <Metric label="Answers evaluated" value={report?.graded ?? 0} />
        <Metric
          label="Practice duration"
          value={
            initial.ended_at
              ? `${Math.round((Date.parse(initial.ended_at) - Date.parse(initial.started_at)) / 60000)} min`
              : "Unavailable"
          }
        />
      </div>
      <div className="st-two-col">
        <Panel
          title="Your performance, explained"
          subtitle={report?.basis || "No rubric feedback is available yet."}
        >
          {report &&
            Object.entries(report.scores).map(([key, value]) => (
              <Progress
                key={key}
                label={key[0].toUpperCase() + key.slice(1)}
                value={value === null ? null : value * 10}
              />
            ))}
          {(report?.pending || 0) > 0 && (
            <p className="st-error">
              {report?.pending} saved answers have not yet been evaluated. They
              are not counted as zero scores.{" "}
              <button
                className="st-button st-button-secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await studentFetch(`sessions/${initial.id}/evaluate`, {
                      method: "POST",
                      body: {},
                    });
                    router.refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Retry pending evaluations
              </button>
            </p>
          )}
        </Panel>
        <Panel title="Interview context">
          <dl className="st-details">
            {[
              ["Company", initial.config.company],
              ["Role", initial.config.role],
              [
                "Mode",
                initial.mode === "mock" ? "Coached mock" : "Proctored AI",
              ],
              ["Language", initial.config.language],
              [
                "Configured duration",
                plural(initial.config.durationMinutes, "minute"),
              ],
              [
                "Completed",
                initial.ended_at
                  ? new Date(initial.ended_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
                  : "Not recorded",
              ],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value || "Not supplied"}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <div className="st-grid">
        {[
          ["Strengths", report?.strengths],
          ["Improvement areas", report?.improvements],
          ["Next practice plan", report?.nextPlan],
        ].map(([title, items]) => (
          <Panel title={String(title)} key={String(title)}>
            {(items as string[] | undefined)?.length ? (
              <ul className="st-bullets">
                {(items as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="st-muted">
                No evaluated evidence recorded for this section.
              </p>
            )}
          </Panel>
        ))}
      </div>
      <Panel title="One answer. A more useful next attempt.">
        <div className="st-coaching-grid">
          <aside>
            {answers.length ? (
              answers.map((answer, index) => (
                <button
                  key={answer.id}
                  aria-current={selected === index ? "true" : undefined}
                  onClick={() => {
                    setSelected(index);
                    setCoaching(null);
                  }}
                >
                  <small>Question {answer.question_index + 1}</small>
                  <span>
                    {initial.questions?.[answer.question_index]?.question ||
                      "Saved answer"}
                  </span>
                </button>
              ))
            ) : (
              <Empty title="No saved transcript is available.">
                Complete another session to receive answer-level coaching.
              </Empty>
            )}
          </aside>
          <div>
            {answers[selected] && (
              <>
                <p className="st-eyebrow">ORIGINAL QUESTION</p>
                <h3>
                  {
                    initial.questions?.[answers[selected].question_index]
                      ?.question
                  }
                </h3>
                <p className="st-eyebrow" style={{ marginTop: 20 }}>
                  YOUR SAVED ANSWER
                </p>
                <p className="st-preserve">{answers[selected].answer}</p>
                <div className="st-coaching-actions">
                  {[
                    "Ideal Answer",
                    "Improve My Answer",
                    "STAR Version",
                    "Concise Version",
                    "Placement-Ready",
                    "Recruiter Expectations",
                    "Mistake Breakdown",
                  ].map((item) => (
                    <button
                      className="st-button st-button-secondary"
                      key={item}
                      disabled={busy}
                      onClick={() => void coach(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <ErrorNote message={error} />
                {busy && (
                  <p role="status" className="st-muted">
                    Preparing specific, useful coaching…
                  </p>
                )}
                {coaching && (
                  <div className="st-career-card">
                    <span className="st-tag">{action}</span>
                    <h3>{coaching.title}</h3>
                    <p>{coaching.explanation}</p>
                    <ul className="st-bullets">
                      {coaching.points.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                    {coaching.rewrite && (
                      <blockquote className="st-preserve">
                        {coaching.rewrite}
                      </blockquote>
                    )}
                    <h3>Why this helps</h3>
                    <p className="st-muted">{coaching.why}</p>
                    <h3>Your next tip</h3>
                    <p className="st-muted">{coaching.nextTip}</p>
                    <button
                      className="st-button st-button-secondary"
                      style={{ marginTop: 15 }}
                      disabled={busy}
                      onClick={() => void coach()}
                    >
                      Regenerate coaching ↗
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Panel>
      {initial.integrity.length > 0 && (
        <Panel title="Recorded browser integrity events">
          <p className="st-muted">
            These are browser-reported events, not proof of identity or
            misconduct.
          </p>
          {initial.integrity.map((event, index) => (
            <div className="st-list-row" key={index}>
              <p>{event.kind.replaceAll("-", " ")}</p>
              <small>
                <DateLabel value={event.at} />
              </small>
            </div>
          ))}
        </Panel>
      )}
      <Link
        href={`/student/interview/${initial.interview_id}`}
        className="st-button"
      >
        Practise this interview again ↗
      </Link>
    </>
  );
}
