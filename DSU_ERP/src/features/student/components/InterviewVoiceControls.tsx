"use client";
import { useEffect, useState } from "react";
import { Check, Headphones, Mic, MicOff, Play, ShieldCheck, LoaderCircle } from "lucide-react";
import { INTERVIEW_VOICES, useInterviewVoice } from "../lib/useInterviewVoice";
import { useInterviewSpeech } from "../lib/useInterviewSpeech";
export function InterviewVoicePicker({ voice, disabled = false }: { voice: ReturnType<typeof useInterviewVoice>; disabled?: boolean }) {
  return <div className="iv-voice-picker">
    <div className="iv-section-label"><Headphones size={14} /><span>Interviewer voice</span><small>4 speaking styles · offline</small></div>
    <div className="iv-voice-grid" role="group" aria-label="Interviewer voice">
      {INTERVIEW_VOICES.map((profile) => <button key={profile.id} type="button" aria-pressed={voice.selected === profile.id} disabled={disabled} className="iv-voice-option" onClick={() => voice.choose(profile.id)}>
        <span className="iv-voice-avatar">{profile.name[0]}</span><span><strong>{profile.name}</strong><small>{profile.description}</small></span>{voice.selected === profile.id && <Check size={13} />}
      </button>)}
    </div>
    <div className="iv-voice-preview"><span>{voice.voiceFor(voice.selected)?.name || "No offline English voice detected"}</span><button type="button" disabled={disabled || !voice.available} onClick={() => voice.playing ? voice.stop() : voice.speak(["Hello. Take your time, think it through, and tell me how you would approach the problem."])}><Play size={12} /> {voice.playing ? "Stop preview" : "Preview voice"}</button></div>
    {!voice.available && <p className="st-muted">Install an English speech voice in your device settings, then reopen this page. Voice choices use installed voices; some styles may share a voice.</p>}
  </div>;
}
export function InterviewSpeechCheck({ onReady, compact = false }: { onReady?: (ready: boolean) => void; compact?: boolean }) {
  const [text, setText] = useState("");
  const speech = useInterviewSpeech(setText);
  useEffect(() => { onReady?.(speech.ready); }, [speech.ready, onReady]);
  return <div className="iv-speech-check">
    <div className="iv-section-label"><ShieldCheck size={14} /><span>Private microphone check</span><small>Processed on this device</small></div>
    <p>{compact ? "Prepare local speech before starting. You can test your microphone here; audio stays on this device." : "Say a short sentence and pause. Your words appear below. No audio is uploaded or sent to a speech service."}</p>
    <div className="st-actions">
      <button type="button" className="st-button st-button-secondary" disabled={speech.loading || speech.transcribing} onClick={async () => { const ready = await speech.prepare(); onReady?.(ready); }}>{speech.loading ? <LoaderCircle className="iv-spin" size={14} /> : <ShieldCheck size={14} />}{speech.ready ? "Offline speech ready" : "Prepare offline speech"}</button>
      <button type="button" className="st-button" disabled={!speech.available || speech.loading || speech.requesting || speech.transcribing} onClick={async () => { if (speech.listening) await speech.stop(); else await speech.start(); }}>{speech.listening ? <MicOff size={14} /> : <Mic size={14} />}{speech.requesting ? "Allow microphone access…" : speech.listening ? "Stop microphone check" : "Test microphone"}</button>
    </div>
    {!compact && <label className="iv-recording-test">Or test a saved recording (up to 30 seconds)<input type="file" accept="audio/*" disabled={speech.loading || speech.listening || speech.transcribing} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void speech.transcribeFile(file); }} /></label>}
    {(!compact || speech.loading || speech.requesting || speech.transcribing || speech.listening || text) && <div role="status" className="iv-transcript-check">{speech.loading ? "Loading the local speech model…" : speech.requesting ? "Waiting for microphone permission. Allow access in the browser prompt." : speech.transcribing ? "Converting speech to text on this device…" : text || (speech.listening ? "Listening. Speak clearly, then pause…" : "Your microphone-check transcript will appear here.")}</div>}
    {speech.error && <p className="st-error" role="alert">{speech.error}</p>}
    <small>Model files load from this app once and are cached by your browser. English transcription runs locally; review the text for mistakes.</small>
  </div>;
}
