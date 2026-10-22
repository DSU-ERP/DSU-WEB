"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AudioLines, Captions, Check, ChevronDown, Expand, GraduationCap, Mic, MicOff, PhoneOff, Send, Settings2, ShieldCheck, Video, VideoOff, Volume2 } from "lucide-react";
import type { InterviewSession } from "../lib/interview-types";
import type { useInterviewVoice } from "../lib/useInterviewVoice";
import { InterviewVoicePicker } from "./InterviewVoiceControls";
import "./interview-meeting.css";

export type PendingTurn = { index: number; question: string; answer: string };
type Props = {
  session: InterviewSession; question: string; answer: string; phase: string; time: string;
  listening: boolean; loading: boolean; requesting: boolean; transcribing: boolean; partial: boolean;
  silenceRemaining: number | null; level: number; autoSend: boolean; voiceEnabled: boolean;
  voiceAllowed: boolean; cameraAllowed: boolean; cameraStream: MediaStream | null;
  voice: ReturnType<typeof useInterviewVoice>; error: string; notice?: string;
  pending: PendingTurn | null; feedback?: ReactNode; retrying: boolean;
  onAnswer: (value: string) => void; onSend: () => void; onMicrophone: () => void;
  onCamera: () => void; onEnd: () => void; onReplay: () => void; onFullscreen: () => void;
  onAutoSend: (value: boolean) => void; onVoice: (value: boolean) => void;
};

export function InterviewMeeting(p: Props) {
  const [settings, setSettings] = useState(false), [captions, setCaptions] = useState(true), [unread, setUnread] = useState(false), [confirmEnd, setConfirmEnd] = useState(false);
  const endDialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null), conversation = useRef<HTMLDivElement>(null), stick = useRef(true);
  const evaluating = p.phase === "evaluating", finishing = p.phase === "finishing", speaking = p.phase === "speaking";
  const status = p.requesting ? "Allow microphone access" : p.loading ? "Preparing local captions" : finishing ? "Preparing your report" : evaluating ? "Maya is reflecting" : speaking ? "Maya is speaking" : p.listening ? "Listening to you" : "Ready when you are";
  const pendingSaved = p.pending && p.session.answers?.some(a => a.question_index === p.pending!.index && a.answer === p.pending!.answer);
  const done = p.session.currentIndex < 0 && !p.retrying;
  const proctored = p.session.mode === "proctored";
  useEffect(() => { if (confirmEnd) endDialog.current?.showModal(); else endDialog.current?.close(); }, [confirmEnd]);
  useEffect(() => { if (video.current) video.current.srcObject = p.cameraStream; }, [p.cameraStream]);
  useEffect(() => {
    const box = conversation.current;
    if (box && stick.current) {
      const current = box.querySelector<HTMLElement>(".im-current-question");
      if (current && !p.answer && !p.pending && !evaluating)
        box.scrollTop += current.getBoundingClientRect().top - box.getBoundingClientRect().top - 12;
      else box.scrollTop = box.scrollHeight;
    }
    else if (box) setUnread(true);
  }, [p.answer, p.question, p.phase, p.session.answers?.length, p.pending]);
  const goLive = () => { stick.current = true; setUnread(false); if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight; };
  const turnStatus = p.listening && p.autoSend && p.silenceRemaining !== null
    ? p.silenceRemaining > 0 ? `Continuing in ${p.silenceRemaining}s · keep speaking to continue your answer` : "Finishing your transcript…"
    : p.listening ? "Live captions · words may adjust as you speak" : proctored ? "Speak naturally. Maya will listen to your answer." : "Speak naturally, or type your answer below.";
  const selfView = <article className="im-tile im-you-tile" data-speaking={p.listening && p.level > .08}>
    {p.cameraStream ? <video ref={video} autoPlay muted playsInline disablePictureInPicture disableRemotePlayback aria-label="Your camera self-view" /> : <div className="im-you-placeholder"><div>Y</div><p>Your camera is off</p>{!proctored && <small>Camera access is required during the interview.</small>}</div>}
    <span className="im-mic-badge">{p.listening ? <Mic size={16} /> : <MicOff size={16} />}</span><div className="im-tile-label"><span>You</span>{!proctored && <span>Only visible on your device</span>}</div>
  </article>;
  return <section className="im-room" data-mode={p.session.mode} data-phase={p.phase} data-listening={p.listening}>
    <header className="im-header"><div className="im-brand"><span><GraduationCap size={21} /></span><div><strong>DSU Interview</strong><h1>{p.session.title}</h1></div></div><div className="im-session-meta"><span className="im-mode">{proctored ? "Proctored practice" : "Practice room"}</span><strong className="im-time" aria-label="Time remaining" suppressHydrationWarning>{p.time}</strong></div></header>
    <div className={`im-layout${captions ? "" : " im-layout-wide"}`}>
      <main className="im-stage" aria-label="Interview participants">
        <div className="im-stage-status" role="status"><i data-active={p.listening || speaking} />{status}<span>{p.session.answeredCount} answers saved</span></div>
        {p.error && <p className="im-error" role="alert">{p.error}</p>}
        {p.notice && <p className="im-notice" role="status">{p.notice}</p>}
        <div className="im-participants">
          <article className="im-tile im-maya-tile" data-speaking={speaking}>
            <span className="im-ai-label">AI INTERVIEWER</span><div className="im-maya-presence"><div className="im-maya-avatar">M</div><div className="im-wave" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 90}ms` }} />)}</div><h2>Maya</h2><p>{evaluating ? "Thank you. One moment…" : speaking ? "Take your time. I’m here to listen." : p.listening ? "Your perspective matters. Go ahead." : "A little practice. A little more confidence."}</p></div>
            <div className="im-tile-label"><span><AudioLines size={15} />Maya · AI interviewer</span><span>Education & career preparation</span></div>
          </article>
          {!proctored && selfView}
        </div>
        <div className="im-stage-caption"><span>{speaking ? "MAYA" : p.listening ? "YOU" : "YOUR CONVERSATION"}</span><p>{done ? "Your conversation is complete. Your report is ready when you are." : p.listening && p.answer ? p.answer : p.question || "Settle in. We’ll begin in a moment."}</p></div>
        {proctored && <div className="im-self-view-dock" aria-label="Your camera preview">{selfView}<div><strong>Your camera</strong><span>Private self-view</span></div></div>}
        <div className="im-stage-footer"><ShieldCheck size={14} /><span>Local captions. No audio or video recording.</span><button type="button" onClick={p.onFullscreen} title="Enter fullscreen" aria-label="Enter fullscreen"><Expand size={17} /></button></div>
      </main>
      {captions && <aside className="im-conversation" aria-label="Interview conversation">
        <header><div><h2>Conversation</h2><p>Your questions and answers, together.</p></div><span className="im-live-badge"><i />LIVE</span></header>
        <div ref={conversation} className="im-transcript" onScroll={() => { const box = conversation.current!; stick.current = box.scrollHeight - box.scrollTop - box.clientHeight < 70; if (stick.current) setUnread(false); }}>
          <p className="im-transcript-note"><Captions size={14} />Captions are generated on your device and may need correction.</p>
          {(p.session.answers || []).map(a => <div className="im-saved-turn" key={a.id}><article className="im-message im-message-maya"><strong>Maya <small>AI interviewer</small></strong><p>{a.question || "Interview question"}</p></article><article className="im-message im-message-you"><strong>You <small><Check size={11} /> Saved</small></strong><p>{a.answer}</p></article></div>)}
          {p.pending && !pendingSaved && <div><article className="im-message im-message-maya"><strong>Maya</strong><p>{p.pending.question}</p></article><article className="im-message im-message-you"><strong>You <small>Sending</small></strong><p>{p.pending.answer}</p></article></div>}
          {!done && !p.pending && <article className="im-message im-message-maya im-current-question"><strong>Maya <small>{p.retrying ? "Practice retry" : p.session.currentIsFollowUp ? "Following up" : "Speaking with you"}</small></strong><p>{p.question}</p><button type="button" onClick={p.onReplay} disabled={!p.voiceAllowed || evaluating || finishing}><Volume2 size={13} />Hear again</button></article>}
          {!p.pending && !done && <article className="im-message im-message-you im-live-answer"><strong>You <small>{p.listening ? p.partial ? "Live · updating" : "Listening" : "Your answer"}</small></strong><p role="status" aria-live="polite" className={!p.answer ? "im-empty-caption" : undefined}>{p.answer || (p.listening ? "Your words will appear here as you speak…" : "Your answer will appear here.")}</p></article>}
          {evaluating && <p className="im-thinking" role="status"><span /><span /><span />Maya is reflecting on your answer…</p>}
          {done && <div className="im-conversation-complete"><Check size={19} /><h3>A good place to reflect.</h3><p>Your answers are saved. Explore your feedback and next practice steps.</p><button type="button" onClick={p.onEnd}>View my report</button></div>}
          {!!p.feedback && <details className="im-feedback"><summary>Review latest feedback<ChevronDown size={14} /></summary>{p.feedback}</details>}
        </div>
        {unread && <button className="im-return-live" type="button" onClick={goLive}>Return to live conversation ↓</button>}
        {!done && <div className="im-composer"><div className="im-turn-status" role="status"><i data-active={p.listening} /><span>{turnStatus}</span></div>{p.session.mode !== "proctored" && !p.listening && !evaluating && <label><span className="sr-only">Your answer · type or speak</span><textarea rows={2} value={p.answer} disabled={evaluating || finishing || p.listening || p.transcribing} maxLength={12000} placeholder="Or type your answer here…" onChange={e => p.onAnswer(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); p.onSend(); } }} /></label>}<div className="im-composer-actions"><button type="button" aria-label="Send answer" onClick={p.onSend} disabled={!p.answer.trim() || evaluating || finishing || p.loading || p.requesting || p.transcribing}><Send size={16} /></button></div></div>}
      </aside>}
    </div>
    {settings && <section className="im-settings" aria-label="Conversation settings"><header><h2>Conversation settings</h2><button type="button" onClick={() => setSettings(false)}>Done</button></header>{p.voiceAllowed ? <><InterviewVoicePicker voice={p.voice} disabled={evaluating || p.listening || p.transcribing} /><label><input type="checkbox" checked={p.voiceEnabled} onChange={e => p.onVoice(e.target.checked)} disabled={evaluating} />Read questions aloud and listen after each one</label><label><input type="checkbox" checked={p.autoSend} onChange={e => p.onAutoSend(e.target.checked)} />Send after five seconds of silence</label></> : <p>This plan uses text answers.</p>}<p>Only academic learning, projects, skills and career preparation. No audio is sent to a transcription service.</p></section>}
    <footer className="im-controls"><div className="im-call-info"><strong suppressHydrationWarning>{p.time}</strong><span>DSU · Interview practice</span></div><div className="im-call-buttons"><button type="button" className={!p.listening ? "im-control-off" : ""} aria-label={p.listening ? "Pause microphone" : "Start microphone"} title={p.listening ? "Pause microphone" : "Start microphone"} aria-pressed={p.listening} disabled={!p.voiceAllowed || evaluating || finishing || p.loading || p.requesting || done} onClick={p.onMicrophone}>{p.listening ? <Mic size={20} /> : <MicOff size={20} />}</button><button type="button" aria-label={p.cameraStream ? "Turn camera off" : "Turn camera on"} title="Camera access is required during the interview" aria-pressed={!!p.cameraStream} className={!p.cameraStream ? "im-control-off" : ""} disabled onClick={p.onCamera}>{p.cameraStream ? <Video size={20} /> : <VideoOff size={20} />}</button><button type="button" aria-label="Show conversation" title="Show conversation" aria-pressed={captions} onClick={() => setCaptions(!captions)}><Captions size={20} /></button><button type="button" aria-label="Conversation settings" title="Conversation settings" aria-pressed={settings} onClick={() => setSettings(!settings)}><Settings2 size={20} /></button><button type="button" className="im-end-call" aria-label="End interview" title="End interview" onClick={() => { if (done) p.onEnd(); else { if (p.listening) p.onMicrophone(); setConfirmEnd(true); } }} disabled={finishing}><PhoneOff size={23} /></button></div></footer>
    <dialog ref={endDialog} className="im-end-dialog" aria-labelledby="im-end-title" onCancel={() => setConfirmEnd(false)}><h2 id="im-end-title">Finish this conversation?</h2><p>Your saved answers will be used to prepare your report. You can start another practice attempt whenever you’re ready.</p><div><button type="button" onClick={() => setConfirmEnd(false)}>Keep practising</button><button type="button" onClick={() => { setConfirmEnd(false); p.onEnd(); }}>End &amp; view report</button></div></dialog>
  </section>;
}
