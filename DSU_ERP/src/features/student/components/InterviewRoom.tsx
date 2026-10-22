"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { studentFetch } from "../lib/client";
import { useInterviewSpeech } from "../lib/useInterviewSpeech";
import { useInterviewVoice } from "../lib/useInterviewVoice";
import { InterviewMeeting, type PendingTurn } from "./InterviewMeeting";
import { InterviewPreflight } from "./InterviewPreflight";
import { InterviewSecurityPause } from "./InterviewSecurityPause";
import { readInterviewSecurity, restrictedInterviewKey, type SecurityIssue } from "../lib/interview-security";
import "./interview-studio.css";
import {
  createHealthMonitor,
  INTEGRITY_LABELS,
  isScoredFeedback,
  sharingActive,
  tracksHealthy,
} from "../lib/interview-insights";
import {
  FeedbackSummary,
  RetryComparison,
} from "./InterviewInsights";
import {
  depositMedia,
  takeMedia,
  stopMedia,
  type InterviewMedia,
} from "../lib/media";
import type {
  AnswerResult,
  InterviewPlanDetail,
  InterviewSession,
  InterviewAnswer,
} from "../lib/interview-types";
export { InterviewPreflight } from "./InterviewPreflight";
export function InterviewPlanView({ plan }: { plan: InterviewPlanDetail }) {
  const router = useRouter();
  const mode = plan.config.preferredMode || "mock";
  const begin = async (media: InterviewMedia) => {
    const result = await studentFetch<{ id: string }>(
      `interviews/${plan.id}/sessions`,
      { method: "POST", body: { mode, accepted: true } },
    );
    depositMedia(result.id, media);
    router.push(`/student/interview/session/${result.id}`);
  };
  return <InterviewPreflight mode={mode} title={plan.title} minutes={plan.config.durationMinutes} channels={plan.config.channels} onReady={begin} />;
}
const INFO_NOTICES: Record<string, string> = {
  inactive:
    "No input for a while. Take your time. This is noted for information only and is not a warning.",
};
type Notice = { tone: "redirect" | "follow-up" | "info"; text: string };
type IntegrityResult = {
  warnings: number;
  ended: boolean;
  severity?: "warning" | "info";
  recorded?: boolean;
};
const INACTIVE_MS = 45000;
export function InterviewRoom({ initial }: { initial: InterviewSession }) {
  const router = useRouter();
  const [session, setSession] = useState(initial),
    [media, setMedia] = useState<InterviewMedia | null>(null),
    [needsAccess, setNeedsAccess] = useState(true),
    [securityPaused, setSecurityPaused] = useState(false),
    [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]),
    [securityWarnings, setSecurityWarnings] = useState(initial.integrity?.filter(e => e.severity === "warning").length || 0),
    [restoringSecurity, setRestoringSecurity] = useState(false),
    [answer, setAnswer] = useState(""),
    [phase, setPhase] = useState("ready"),
    [voice, setVoice] = useState(initial.mode === "proctored" || initial.config.channels?.voice !== false),
    [autoSend, setAutoSend] = useState(initial.mode === "proctored" || initial.config.channels?.voice !== false),
    [pendingTurn, setPendingTurn] = useState<PendingTurn | null>(null),
    [remaining, setRemaining] = useState(
      Math.max(
        0,
        Math.ceil((Date.parse(initial.expires_at) - Date.now()) / 1000),
      ),
    ),
    [error, setError] = useState(""),
    [notice, setNotice] = useState<Notice | null>(null),
    [mediaIssue, setMediaIssue] = useState(""),
    [last, setLast] = useState<InterviewAnswer | null>(
      initial.answers?.at(-1) || null,
    ),
    [retrying, setRetrying] = useState(false),
    [lastQuestion, setLastQuestion] = useState(
      initial.answers?.at(-1)?.question || "",
    ),
    [selfView, setSelfView] = useState<MediaStream | null>(null),
    [leftFullscreen, setLeftFullscreen] = useState(false);
  const camera = useRef<HTMLVideoElement>(null),
    selfViewVideo = useRef<HTMLVideoElement>(null),
    selfViewStream = useRef<MediaStream | null>(null),
    selfViewPending = useRef(false),
    live = useRef(true),
    finishing = useRef(false),
    processing = useRef(false),
    text = useRef(""),
    fromSpeech = useRef(false),
    spokenIndex = useRef(-2),
    speechToken = useRef(0),
    activity = useRef(Date.now()),
    wasFullscreen = useRef(false),
    phaseRef = useRef(phase),
    voiceRef = useRef(voice),
    autoSendRef = useRef(autoSend),
    submitRef = useRef<() => void>(() => {}),
    currentMedia = useRef<InterviewMedia | null>(null),
    securityHold = useRef(false),
    failedIntegrity = useRef(new Map<string, {kind: string; detail: string; incidentId: string}>()),
    integrityInFlight = useRef(new Set<Promise<void>>());
  phaseRef.current = phase;
  voiceRef.current = voice;
  autoSendRef.current = autoSend;
  currentMedia.current = media;
  selfViewStream.current = selfView;
  const proctored = session.mode === "proctored";
  const voiceAllowed = proctored || session.config.channels?.voice !== false;
  const cameraAllowed = true;
  // Local rolling captions update during speech. Five seconds after the last
  // detected speech, a fully transcribed answer is submitted once.
  const interviewVoice = useInterviewVoice(session.config.language);
  const speech = useInterviewSpeech(
    (value) => {
      setAnswer(value);
      text.current = value;
      fromSpeech.current = true;
      activity.current = Date.now();
      saveDraft(value);
    },
    () => {
        if (
          live.current &&
          !securityHold.current &&
          autoSendRef.current &&
          phaseRef.current === "listening" &&
          !processing.current
        )
          submitRef.current();
      },
  );
  useEffect(() => {
    live.current = true;
    const granted =
      currentMedia.current ||
      takeMedia(initial.id);
    currentMedia.current = granted;
    setMedia(granted);
    setNeedsAccess(
      readInterviewSecurity(granted).length > 0,
    );
    // Voices load asynchronously; asking early lets the first question use
    // the preferred natural voice.
    window.speechSynthesis?.getVoices();
    return () => {
      live.current = false;
      window.speechSynthesis?.cancel();
      selfViewStream.current?.getTracks().forEach((track) => track.stop());
      setTimeout(() => {
        if (!live.current && currentMedia.current)
          stopMedia(currentMedia.current);
      }, 0);
    };
  }, [initial.id, initial.mode]);
  useEffect(() => {
    if (camera.current) camera.current.srcObject = media?.camera || null;
  }, [media]);
  useEffect(() => {
    if (selfViewVideo.current) selfViewVideo.current.srcObject = selfView;
  }, [selfView]);
  useEffect(() => {
    const change = () => {
      const active = !!document.fullscreenElement;
      if (active) wasFullscreen.current = true;
      setLeftFullscreen(!active && wasFullscreen.current);
    };
    change();
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setError(
        "Your browser did not allow fullscreen. Use the browser's own fullscreen option instead.",
      );
    }
  };
  const toggleSelfView = async () => {
    if (!proctored && media?.camera) {
      media.camera.getTracks().forEach((track) => track.stop());
      setMedia((current) => current ? { ...current, camera: null } : current);
      return;
    }
    if (selfView) {
      selfView.getTracks().forEach((track) => track.stop());
      setSelfView(null);
      return;
    }
    if (selfViewPending.current) return;
    selfViewPending.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      // Left the room while the permission prompt was open: release the camera.
      if (!live.current) stream.getTracks().forEach((track) => track.stop());
      else setSelfView(stream);
    } catch {
      setError(
        "Camera access was not granted. Self-view stays off; mock practice does not need it.",
      );
    } finally {
      selfViewPending.current = false;
    }
  };
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
    speech.cancel();
    window.speechSynthesis?.cancel();
    setPhase("finishing");
    try {
      await studentFetch(`sessions/${session.id}/finish`, {
        method: "POST",
        body: {},
      });
      if (media) stopMedia(media);
      selfView?.getTracks().forEach((track) => track.stop());
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
  // What Maya says for the current question; follow-ups are introduced.
  const questionLines = (data: InterviewSession = session) => {
    const question = retrying ? lastQuestion : data.currentQuestion;
    if (!question) return [];
    return data.currentIsFollowUp && !retrying
      ? ["Let me follow up on that.", question]
      : [question];
  };
  const say = (lines: string[], listen: boolean) => {
    // A redirect queued by a save that finished after the room closed or the
    // interview ended must not start speaking.
    if (!live.current || finishing.current || securityHold.current || readInterviewSecurity(currentMedia.current).length) return;
    if (!lines.length || !("speechSynthesis" in window)) return;
    speech.cancel();
    const token = ++speechToken.current;
    interviewVoice.speak(lines, {
      onStart: () => {
        if (token === speechToken.current) setPhase("speaking");
      },
      onEnd: () => {
        if (token !== speechToken.current) return;
        if (!live.current || processing.current || securityHold.current || readInterviewSecurity(currentMedia.current).length) return;
        if (!listen) {
          setPhase("ready");
          return;
        }
        setPhase("listening");
        activity.current = Date.now();
        speech.startWith(fromSpeech.current ? "" : text.current);
      },
      onError: () => {
        if (token !== speechToken.current) return;
        setPhase("ready");
        setError(
          "No offline English voice is available, or speech stopped. Check your installed voices, replay, or continue by typing in mock mode.",
        );
      },
    });
  };
  const speak = (force = false) => {
    if (!voice && !force) return;
    say(questionLines(), true);
  };
  useEffect(() => {
    if (
      !needsAccess &&
      !securityPaused &&
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
  }, [session.currentIndex, needsAccess, securityPaused, voice, media]);
  const pauseForSecurity = (issues: SecurityIssue[]) => {
    if (!live.current || finishing.current) return;
    setSecurityIssues(issues);
    if (securityHold.current) return;
    securityHold.current = true;
    speechToken.current++; interviewVoice.stop(); void speech.stop();
    phaseRef.current = "paused"; setPhase("paused"); setSecurityPaused(true);
  };
  const restoreSecurity = async () => {
    if (restoringSecurity || finishing.current) return;
    setRestoringSecurity(true); setError("");
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      const issues = readInterviewSecurity(currentMedia.current);
      if (issues.length) { setSecurityIssues(issues); return; }
      while (integrityInFlight.current.size) await Promise.all([...integrityInFlight.current]);
      if (!live.current) return;
      for (const [incidentId, body] of failedIntegrity.current) {
        const result = await studentFetch<IntegrityResult>(`sessions/${session.id}/integrity`, { method: "POST", body });
        setSecurityWarnings(result.warnings); failedIntegrity.current.delete(incidentId);
        if (result.ended) { live.current = false; router.push(`/student/interview/report/${session.id}`); return; }
      }
      const updated = await refresh();
      if (updated.status !== "active") { live.current = false; router.push(`/student/interview/report/${session.id}`); return; }
      const changed = readInterviewSecurity(currentMedia.current);
      if (changed.length) { setSecurityIssues(changed); return; }
      securityHold.current = false; setSecurityPaused(false); setSecurityIssues([]);
      fromSpeech.current = false; spokenIndex.current = -2; setPhase("ready");
    } catch(e) { setError((e as Error).message); }
    finally { setRestoringSecurity(false); }
  };
  useEffect(() => {
    if (session.status !== "active" || needsAccess || !media) return;
    const lastSent = { warning: 0, info: 0 };
    const record = (kind: string, severity: "warning" | "info", detail = "") => {
      if (!live.current || finishing.current) return;
      if (severity === "warning") pauseForSecurity([{ kind, message: INTEGRITY_LABELS[kind] || "Restore the interview security checks before continuing." }]);
      if (Date.now() - lastSent[severity] < 1800) return;
      lastSent[severity] = Date.now();
      const body = { kind, detail, incidentId: crypto.randomUUID() };
      const pending = studentFetch<IntegrityResult>(`sessions/${session.id}/integrity`, { method: "POST", body })
        .then(result => {
          setSecurityWarnings(result.warnings);
          if (result.ended) { live.current = false; speech.cancel(); interviewVoice.stop(); stopMedia(media); router.push(`/student/interview/report/${session.id}`); return; }
          if (!result.recorded) return;
          if (result.severity === "info") setNotice({ tone: "info", text: INFO_NOTICES[kind] || "" });
          else setError(`Browser integrity warning ${result.warnings}/3: ${INTEGRITY_LABELS[kind] || kind}.`);
        })
        .catch(e => { if (severity === "warning") failedIntegrity.current.set(body.incidentId, body); setError(e.message); })
        .finally(() => { integrityInFlight.current.delete(pending); });
      integrityInFlight.current.add(pending);
    };
    const inspect = () => {
      const issues = readInterviewSecurity(media);
      if (issues.length) pauseForSecurity(issues);
    };
    const hidden = () => { if (document.hidden) record("tab-hidden", "warning"); inspect(); };
    const fullscreen = () => { if (!document.fullscreenElement) record("fullscreen-exit", "warning"); inspect(); };
    const clipboard = (event: Event) => { event.preventDefault(); record("clipboard", "warning"); };
    const contextMenu = (event: Event) => { event.preventDefault(); record("context-menu", "warning"); };
    const drop = (event: Event) => { event.preventDefault(); record("drag-drop", "warning"); };
    const keyboard = (event: KeyboardEvent) => { const kind = restrictedInterviewKey(event); if (kind) { event.preventDefault(); record(kind, "warning"); } };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!finishing.current && live.current) { event.preventDefault(); event.returnValue = ""; } };
    const active = () => { activity.current = Date.now(); };
    const monitor = createHealthMonitor(2);
    const sources = [
      ["camera-stopped", "camera", () => media.camera?.getVideoTracks(), tracksHealthy],
      ["mic-stopped", "microphone", () => media.camera?.getAudioTracks(), tracksHealthy],
      ["screen-stopped", "screen sharing", () => media.screen?.getVideoTracks(), sharingActive],
    ] as const;
    const trackListeners: { track: MediaStreamTrack; ended: () => void }[] = [];
    for (const [kind, , tracks] of sources) for (const track of tracks() || []) {
      const ended = () => { inspect(); record(kind, "warning", "ended"); };
      track.addEventListener("ended", ended); trackListeners.push({track, ended});
    }
    const display = window.screen as Screen & { isExtended?: boolean } & Partial<EventTarget>;
    let extended = false;
    const displayChanged = () => {
      const extra = display.isExtended === true || !!media.displays && media.displays.screens.length !== 1;
      if (extra && !extended) record("extended-display", "warning");
      extended = extra; inspect();
    };
    const health = setInterval(() => {
      inspect();
      const problems: string[] = [];
      for (const [kind, name, tracks, check] of sources) {
        const list = tracks() || [], healthy = check(list);
        if (!healthy) problems.push(name);
        if (monitor(kind, healthy)) record(kind, "warning", "ended-muted-or-disabled");
      }
      if (monitor("focus-lost", document.hidden || document.hasFocus())) record("focus-lost", "warning", "no focus for two checks");
      const issues = readInterviewSecurity(media);
      if (monitor("restricted-window", !issues.some(i => i.kind === "restricted-window"))) record("restricted-window", "warning", "reduced full-screen coverage");
      if (monitor("picture-in-picture", !document.pictureInPictureElement)) record("picture-in-picture", "warning");
      setMediaIssue(problems.length ? `Restore your ${problems.join(" and ")}.` : "");
      displayChanged();
    }, 1600);
    let reportedAt = 0;
    const inactivity = setInterval(() => {
      if (["speaking", "evaluating", "finishing", "paused"].includes(phaseRef.current)) activity.current = Date.now();
      if (Date.now() - activity.current >= INACTIVE_MS && reportedAt !== activity.current) { reportedAt = activity.current; record("inactive", "info", "45s without input"); }
    }, 5000);
    displayChanged();
    display.addEventListener?.("change", displayChanged);
    media.displays?.addEventListener("screenschange", displayChanged);
    document.addEventListener("visibilitychange", hidden); document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("contextmenu", contextMenu); document.addEventListener("drop", drop); document.addEventListener("dragstart", drop);
    const dragover = (event: Event) => event.preventDefault(); document.addEventListener("dragover", dragover);
    for (const name of ["copy", "cut", "paste"]) document.addEventListener(name, clipboard);
    window.addEventListener("keydown", keyboard, true); window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("resize", inspect); window.addEventListener("blur", inspect);
    for (const name of ["keydown", "pointerdown", "pointermove", "wheel"]) window.addEventListener(name, active, {passive:true});
    return () => {
      clearInterval(health); clearInterval(inactivity);
      trackListeners.forEach(({track,ended})=>track.removeEventListener("ended",ended));
      display.removeEventListener?.("change", displayChanged); media.displays?.removeEventListener("screenschange", displayChanged);
      document.removeEventListener("visibilitychange", hidden); document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("contextmenu", contextMenu); document.removeEventListener("drop", drop); document.removeEventListener("dragstart", drop); document.removeEventListener("dragover",dragover);
      for (const name of ["copy", "cut", "paste"]) document.removeEventListener(name, clipboard);
      window.removeEventListener("keydown", keyboard, true); window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("resize", inspect); window.removeEventListener("blur", inspect);
      for (const name of ["keydown", "pointerdown", "pointermove", "wheel"]) window.removeEventListener(name,active);
    };
  }, [session.id, session.status, needsAccess, media, router]);
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
  const clearAnswer = () => {
    setAnswer("");
    text.current = "";
    fromSpeech.current = false;
    saveDraft("");
  };
  const submit = async () => {
    // Any non-empty answer can be saved ("56" can be complete); voice only
    // auto-saves longer text. Nothing is sent once every question is answered.
    if (processing.current || !text.current.trim() || !remaining || needsAccess || securityHold.current || readInterviewSecurity(currentMedia.current).length) return;
    if (!(retrying && last) && session.currentIndex < 0) return;
    processing.current = true;
    setPhase("evaluating");
    await speech.stop();
    speechToken.current++;
    window.speechSynthesis?.cancel();
    setError("");
    setNotice(null);
    const questionIndex =
      retrying && last ? last.question_index : session.currentIndex;
    const prompt = retrying ? lastQuestion : session.currentQuestion || "";
    setPendingTurn({ index: questionIndex, question: prompt, answer: text.current.trim() });
    const spoken = fromSpeech.current;
    let next: (() => void) | null = null;
    try {
      const result = await studentFetch<AnswerResult>(
        `sessions/${session.id}/answer`,
        {
          method: "POST",
          body: { questionIndex, answer: text.current.trim(), retry: retrying },
        },
      );
      if (result.redirect) {
        // Same question: Maya redirects and the student answers again.
        const redirect = result.redirect;
        if (spoken || proctored) clearAnswer();
        const updated = result.saved ? await refresh() : session;
        setNotice({ tone: "redirect", text: redirect.message });
        const repeat = proctored || redirect.category === "clarification";
        if (voiceRef.current)
          next = () =>
            say(
              [redirect.message, ...(repeat ? questionLines(updated) : [])],
              true,
            );
        setPhase("ready");
        return;
      }
      setLastQuestion(prompt);
      clearAnswer();
      setRetrying(false);
      const updated = await refresh();
      if (result.followUp && updated.currentIsFollowUp)
        setNotice({
          tone: "follow-up",
          text: "Maya has one follow-up question on your last answer.",
        });
      if (
        (updated.currentIndex < 0 && (proctored || autoSendRef.current)) ||
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
      setPendingTurn(null);
      processing.current = false;
      if (Date.parse(session.expires_at) <= Date.now() && !finishing.current)
        void finish();
      else next?.();
    }
  };
  submitRef.current = () => void submit();
  if (needsAccess)
    return (
      <InterviewPreflight
        mode={session.mode}
        channels={session.config.channels}
        title={session.title}
        minutes={Math.ceil(remaining / 60)}
        onReady={async (granted) => {
          const previous = currentMedia.current;
          if (previous && previous !== granted) stopMedia(previous);
          setMedia(granted);
          currentMedia.current = granted;
          setMediaIssue("");
          setNeedsAccess(false);
          securityHold.current = false; setSecurityPaused(false); setSecurityIssues([]);
          spokenIndex.current = -2; fromSpeech.current = false; setPhase("ready");
          live.current = true;
        }}
      />
    );
  const time = `${Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
  const canRetry =
    !!last &&
    !last.retried &&
    isScoredFeedback(last.feedback) &&
    !["Placement-ready", "Excellent"].includes(last.feedback.quality || "");
  return <><InterviewMeeting
    session={session} question={retrying ? lastQuestion : session.currentQuestion || ""}
    answer={answer} phase={phase} time={time} retrying={retrying} pending={pendingTurn}
    listening={speech.listening} loading={speech.loading} requesting={speech.requesting}
    transcribing={speech.transcribing} partial={speech.partial} silenceRemaining={speech.silenceRemaining}
    level={speech.level} voiceAllowed={voiceAllowed} cameraAllowed={cameraAllowed}
    cameraStream={media?.camera || selfView} voice={interviewVoice}
    error={securityPaused ? "" : error || speech.error || mediaIssue}
    notice={notice?.text} autoSend={autoSend} voiceEnabled={voice}
    onAutoSend={setAutoSend} onVoice={(enabled) => {
      setVoice(enabled);
      if (!enabled) { speechToken.current++; interviewVoice.stop(); void speech.stop(); setPhase("ready"); }
    }}
    onAnswer={(value) => { setAnswer(value); text.current = value; fromSpeech.current = false; saveDraft(value); }}
    onSend={() => void submit()} onCamera={() => void toggleSelfView()}
    onMicrophone={() => {
      if (speech.listening) { void speech.stop(); setPhase("ready"); return; }
      speechToken.current++; interviewVoice.stop(); setPhase("listening"); void speech.startWith(text.current);
    }}
    onReplay={() => { setVoice(true); speak(true); }}
    onFullscreen={() => void enterFullscreen()}
    onEnd={() => void finish()}
    feedback={!proctored && last?.feedback?.scores ? <div className="st-live-coaching">
      <FeedbackSummary feedback={last.feedback} compact />
      {isScoredFeedback(last.feedback) && <p>{last.feedback.explanation}</p>}
      {canRetry && <button className="st-button st-button-secondary" onClick={() => {
        setRetrying(true); clearAnswer(); setNotice(null);
        if (voiceRef.current) requestAnimationFrame(() => say([lastQuestion], true));
      }}>Try again with feedback ↗</button>}
      {last.retried && <RetryComparison original={last.original_feedback} retry={last.feedback} />}
    </div> : undefined}
  />{securityPaused && <InterviewSecurityPause issues={securityIssues} warnings={securityWarnings} busy={restoringSecurity}
    error={error} onRestore={() => void restoreSecurity()} onDevices={() => setNeedsAccess(true)} onEnd={() => void finish()} />}</>;
}

export { InterviewResults } from "./InterviewReport";
