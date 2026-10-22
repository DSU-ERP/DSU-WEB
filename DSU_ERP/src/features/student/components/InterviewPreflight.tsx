"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Expand, MonitorUp, ShieldCheck, Video } from "lucide-react";
import { InterviewSpeechCheck, InterviewVoicePicker } from "./InterviewVoiceControls";
import { useInterviewVoice } from "../lib/useInterviewVoice";
import { readInterviewSecurity } from "../lib/interview-security";
import { stopMedia, type InterviewMedia } from "../lib/media";
import type { InterviewConfig } from "../lib/interview-types";
import { ErrorNote } from "./UI";
import { plural } from "../lib/progress";

export function InterviewPreflight({ mode, title, minutes, channels, onReady }: {
  mode: "mock" | "proctored"; title: string; minutes: number;
  channels?: InterviewConfig["channels"]; onReady: (media: InterviewMedia) => Promise<void>;
}) {
  const [media, setMedia] = useState<InterviewMedia>({ camera: null, screen: null });
  const [accepted, setAccepted] = useState(false), [speechReady, setSpeechReady] = useState(false);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [, update] = useState(0);
  const saved = useRef(media), transferred = useRef(false), starting = useRef(false), mounted = useRef(true);
  const voice = useInterviewVoice();
  saved.current = media;
  const spoken = mode === "proctored" || channels?.voice !== false;
  useEffect(() => {
    mounted.current = true;
    const changed = () => update(value => value + 1);
    const interval = setInterval(changed, 1000);
    for (const event of ["fullscreenchange", "visibilitychange"]) document.addEventListener(event, changed);
    window.addEventListener("focus", changed); window.addEventListener("resize", changed);
    return () => {
      mounted.current = false; clearInterval(interval);
      for (const event of ["fullscreenchange", "visibilitychange"]) document.removeEventListener(event, changed);
      window.removeEventListener("focus", changed); window.removeEventListener("resize", changed);
      if (!transferred.current) stopMedia(saved.current);
    };
  }, []);
  const camera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!mounted.current) { stream.getTracks().forEach(t => t.stop()); return; }
      saved.current.camera?.getTracks().forEach(t => t.stop());
      setMedia(current => ({ ...current, camera: stream }));
    } catch { setError("Camera and microphone access are required in both interview modes. Check your permissions and try again."); }
  };
  const display = async () => {
    setError("");
    try {
      const getDetails = (window as Window & { getScreenDetails?: () => Promise<NonNullable<InterviewMedia["displays"]>> }).getScreenDetails;
      if (getDetails) {
        const details = await getDetails.call(window);
        if (!mounted.current) return;
        setMedia(current => ({ ...current, displayChecked: true, displays: details }));
        if (details.screens.length !== 1) setError("Disconnect additional displays, then check again. Only one display is allowed.");
      } else if (typeof (window.screen as Screen & { isExtended?: boolean }).isExtended === "boolean") {
        setMedia(current => ({ ...current, displayChecked: true }));
        if ((window.screen as Screen & { isExtended?: boolean }).isExtended) setError("Disconnect additional displays before continuing.");
      } else setError("This browser cannot check connected displays. Open the interview in a supported desktop Chrome or Edge browser.");
    } catch { setError("Allow the display-check permission and try again. The single-display check is required before starting."); }
  };
  const screen = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "monitor" }, audio: false });
      if (!mounted.current) { stream.getTracks().forEach(t => t.stop()); return; }
      if (stream.getVideoTracks()[0]?.getSettings().displaySurface !== "monitor") { stream.getTracks().forEach(t => t.stop()); throw Error(); }
      saved.current.screen?.getTracks().forEach(t => t.stop());
      setMedia(current => ({ ...current, screen: stream }));
    } catch { setError("Choose your entire screen in the sharing prompt. A window or tab does not meet the interview requirements."); }
  };
  const fullscreen = async () => {
    try { await document.documentElement.requestFullscreen(); setError(""); }
    catch { setError("Fullscreen is required. Open the interview in a desktop browser that supports fullscreen and entire-screen sharing."); }
  };
  const issues = typeof window === "undefined" ? [] : readInterviewSecurity(media);
  const ready = typeof window !== "undefined" && issues.length === 0 && (!spoken || speechReady && voice.available);
  const begin = async () => {
    if (starting.current) return;
    const problem = readInterviewSecurity(saved.current)[0];
    if (!accepted || problem || spoken && (!speechReady || !voice.available)) {
      setError(problem?.message || "Complete the required checks and agree to the interview instructions."); return;
    }
    starting.current = true; transferred.current = true; setBusy(true); setError("");
    try { await onReady(saved.current); }
    catch(e) { starting.current = false; transferred.current = false; if (mounted.current) { setBusy(false); setError((e as Error).message); } }
  };
  const cameraReady = !!media.camera?.getVideoTracks().some(t => t.readyState === "live" && t.enabled && !t.muted) && !!media.camera.getAudioTracks().some(t => t.readyState === "live" && t.enabled && !t.muted);
  const screenReady = !!media.screen?.getVideoTracks().some(t => t.readyState === "live" && t.getSettings().displaySurface === "monitor");
  const displayReady = media.displayChecked && !issues.some(i => ["extended-display", "display-check"].includes(i.kind));
  return <div className="iw-preflight-wrap iw-direct-instructions"><section className="st-preflight">
    <div className="st-preflight-story"><span className="st-tag">{mode === "mock" ? "SECURED COACHED PRACTICE" : "PROCTORED AI SESSION"}</span><h1>Interview instructions</h1><p className="iw-instruction-title">{title}</p><p>Complete the security checks and agree below. A new interview timer starts only when you begin; a resumed interview keeps its original timer.</p><div className="st-actions"><span>{plural(minutes, "minute")}</span><span>{mode === "mock" ? spoken ? "Typed or spoken answers" : "Typed answers" : "Spoken answers"}</span><span>AI interviewer</span></div><p className="st-muted">Maya is a synthetic AI interviewer, not a live human recruiter.</p></div>
    <div className="st-preflight-checklist"><h2>Required in every interview</h2>
      <ul className="st-bullets"><li>Use one display, the full screen and this interview tab only. Split-screen and reduced window coverage are not allowed.</li><li>Keep your camera, microphone and entire-screen sharing active.</li><li>Tab switches, leaving fullscreen and sustained focus loss pause the interview. Copy, cut, paste, drag/drop and browser navigation shortcuts are restricted.</li><li>Three recorded browser integrity warnings end the interview. Your saved answers remain available in the report.</li><li>{mode === "mock" ? "Coached practice still supports typed answers, feedback and a practice retry." : "Scores and coaching stay hidden until completion."}</li></ul>
      <div className="st-access-checks">{[
        { label: "Camera & microphone", ready: cameraReady, action: camera, Icon: Video, verb: "Enable" },
        { label: "Single-display check", ready: displayReady, action: display, Icon: ShieldCheck, verb: "Check" },
        { label: "Entire-screen sharing", ready: screenReady, action: screen, Icon: MonitorUp, verb: "Share" },
        { label: "Fullscreen workspace", ready: typeof document !== "undefined" && !!document.fullscreenElement, action: fullscreen, Icon: Expand, verb: "Enter" },
      ].map(item => <button type="button" key={item.label} onClick={() => void item.action()} disabled={busy || !!item.ready}><item.Icon size={18} /><span>{item.label}</span>{item.ready ? <Check size={17} /> : item.verb}</button>)}</div>
      {issues.some(i => i.kind === "extended-display") && <p role="status" className="st-muted">Disconnect additional displays to continue.</p>}
      {spoken && <details className="iw-device-options" open><summary>Required speech setup</summary><InterviewVoicePicker voice={voice} /><InterviewSpeechCheck onReady={setSpeechReady} compact /></details>}
      <p className="st-muted">Media stays on your device and is not recorded or uploaded. These checks do not provide face recognition or control over operating-system shortcuts, other devices or browser extensions. Supported browser events and screen coverage are monitored; this is not a locked examination browser.</p>
      <label className="st-consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />I agree to the interview instructions, required security checks, timer and use of my answers for AI evaluation.</label><ErrorNote message={error} />
      <button type="button" className="st-button" disabled={!ready || !accepted || busy} onClick={() => void begin()}>{busy ? "Opening your session…" : mode === "mock" ? "Begin mock interview ↗" : "Begin proctored AI interview ↗"}</button>
      <Link className="st-muted" href="/student/interview?view=library">← Back to interview library</Link>
    </div></section></div>;
}
