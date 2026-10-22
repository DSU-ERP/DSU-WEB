"use client";
import { useEffect, useRef, useState } from "react";
export const INTERVIEW_VOICES = [
  { id: "calm", name: "Calm", description: "Measured & reassuring", rate: 0.92, pitch: 1.02, preference: /zira|samantha|heera|veena|female/i },
  { id: "clear", name: "Clear", description: "Steady & articulate", rate: 0.98, pitch: 0.98, preference: /david|daniel|ravi|rishi|male/i },
  { id: "warm", name: "Warm", description: "Friendly & conversational", rate: 0.96, pitch: 1.12, preference: /hazel|karen|susan|zira|female/i },
  { id: "focused", name: "Focused", description: "Direct & deliberate", rate: 1.03, pitch: 0.88, preference: /mark|george|david|male/i },
] as const;
export type InterviewVoiceId = typeof INTERVIEW_VOICES[number]["id"];
export function useInterviewVoice(language = "en-IN") {
  const [selected, setSelected] = useState<InterviewVoiceId>("calm"), [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]), [playing, setPlaying] = useState(false);
  const utterances = useRef<SpeechSynthesisUtterance[]>([]);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => setVoices(synth.getVoices().filter((voice) => voice.localService && /^en([_-]|$)/i.test(voice.lang)));
    load(); synth.addEventListener("voiceschanged", load);
    try { const saved = localStorage.getItem("dsu-interview-voice"); if (INTERVIEW_VOICES.some((voice) => voice.id === saved)) setSelected(saved as InterviewVoiceId); } catch {}
    return () => synth.removeEventListener("voiceschanged", load);
  }, []);
  const choose = (id: InterviewVoiceId) => {
    setSelected(id); try { localStorage.setItem("dsu-interview-voice", id); } catch {}
  };
  const voiceFor = (id: InterviewVoiceId) => {
    const profile = INTERVIEW_VOICES.find((item) => item.id === id)!;
    const sorted = [...voices].sort((a, b) => {
      const rank = (voice: SpeechSynthesisVoice) => (voice.lang.toLowerCase() === language.toLowerCase() ? 10 : 0) + (profile.preference.test(voice.name) ? 5 : 0) + (/natural|neural|enhanced/i.test(voice.name) ? 3 : 0);
      return rank(b) - rank(a);
    });
    return sorted[0] || null;
  };
  const speak = (lines: string[], options: { onStart?: () => void; onEnd?: () => void; onError?: () => void } = {}, id = selected) => {
    const voice = voiceFor(id), parts = lines.map((line) => line.trim()).filter(Boolean);
    if (!voice || !parts.length) { options.onError?.(); return false; }
    const profile = INTERVIEW_VOICES.find((item) => item.id === id)!;
    window.speechSynthesis.cancel();
    utterances.current = parts.map((part, index) => {
      const utterance = new SpeechSynthesisUtterance(part);
      utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = profile.rate; utterance.pitch = profile.pitch;
      if (index === 0) utterance.onstart = () => { setPlaying(true); options.onStart?.(); };
      if (index === parts.length - 1) utterance.onend = () => { setPlaying(false); options.onEnd?.(); };
      utterance.onerror = (event) => { setPlaying(false); if (!["interrupted", "canceled"].includes(event.error)) options.onError?.(); };
      return utterance;
    });
    for (const utterance of utterances.current) window.speechSynthesis.speak(utterance);
    return true;
  };
  const stop = () => { window.speechSynthesis?.cancel(); setPlaying(false); };
  return { selected, choose, speak, stop, playing, available: voices.length > 0, voiceFor };
}
