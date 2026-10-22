"use client";
import { useEffect, useRef, useState } from "react";
import { pickVoice } from "@/shared/speech/voice";
import {
  joinSpeech,
  readyToSubmit,
  splitTranscript,
  MIN_SPOKEN_CHARS,
  SILENCE_SUBMIT_MS,
  type RecognitionResultLike,
} from "./speech-text";
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
export type SpeechOptions = {
  // Keep listening across pauses and browser restarts until stop().
  continuous?: boolean;
  // Continuous mode: called once the speaker has been silent for silenceMs
  // with at least minChars of text.
  onSilence?: (text: string) => void;
  silenceMs?: number;
  minChars?: number;
};
// Continuous capture restarts when the browser ends recognition on its own
// (after silence, a time limit or a brief interruption). A session that ends
// almost as soon as it starts is a failure, not a pause, so restarts back off
// (0.35 s, 0.7 s, 1.4 s ... up to 5 s) and stop after MAX_RESTARTS within
// RESTART_WINDOW_MS. Errors a restart cannot fix stop capture at once.
const RESTART_DELAY_MS = 350;
const MAX_RESTART_DELAY_MS = 5000;
const QUICK_END_MS = 1500;
const RESTART_WINDOW_MS = 30000;
const MAX_RESTARTS = 8;
const STOP_ERRORS: Record<string, string> = {
  "not-allowed":
    "Microphone access was declined. Allow it in your browser's site settings, then try again.",
  "service-not-allowed":
    "Microphone access was declined. Allow it in your browser's site settings, then try again.",
  "audio-capture": "No microphone was found. Connect one, then try again.",
  network:
    "Speech recognition needs a network connection. Check your connection, then try again.",
  "language-not-supported":
    "Speech recognition does not support this language in this browser.",
};
export function useSpeechInput(
  onText: (text: string) => void,
  language = "en-IN",
  onEnd?: () => void,
  options: SpeechOptions = {},
) {
  const [available, setAvailable] = useState(false),
    [listening, setListening] = useState(false),
    [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null),
    callback = useRef(onText),
    ended = useRef(onEnd),
    settings = useRef(options),
    wanted = useRef(false),
    base = useRef(""),
    latest = useRef(""),
    silence = useRef<ReturnType<typeof setTimeout> | null>(null),
    restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    restarts = useRef<number[]>([]),
    quickEnds = useRef(0);
  callback.current = onText;
  ended.current = onEnd;
  settings.current = options;
  const constructor = () => {
    const browser = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    return browser.SpeechRecognition || browser.webkitSpeechRecognition;
  };
  const clearSilence = () => {
    if (silence.current) clearTimeout(silence.current);
    silence.current = null;
  };
  const clearRestart = () => {
    if (restartTimer.current) clearTimeout(restartTimer.current);
    restartTimer.current = null;
  };
  useEffect(() => {
    setAvailable(!!constructor());
    return () => {
      wanted.current = false;
      if (silence.current) clearTimeout(silence.current);
      if (restartTimer.current) clearTimeout(restartTimer.current);
      recognition.current?.abort();
    };
  }, []);
  const launch = () => {
    const Constructor = constructor();
    if (!Constructor) {
      setError(
        "Speech recognition is unavailable in this browser. You can type your answer.",
      );
      wanted.current = false;
      return;
    }
    const continuous = !!settings.current.continuous;
    let failed = false;
    const startedAt = Date.now();
    const instance = new Constructor();
    instance.lang = language;
    instance.continuous = continuous;
    instance.interimResults = true;
    instance.onresult = (event) => {
      if (recognition.current !== instance) return;
      // After stop() the browser still delivers the last result. In
      // continuous mode it must not refill an answer that was just saved,
      // or pick up the interviewer's voice that stop() was called for.
      if (continuous && !wanted.current) return;
      const results = (event as { results: ArrayLike<RecognitionResultLike> })
        .results;
      if (!continuous) {
        callback.current(
          Array.from(results)
            .map((item) => item[0]?.transcript || "")
            .join(" ")
            .trim(),
        );
        return;
      }
      const { final, interim } = splitTranscript(results);
      const text = joinSpeech(base.current, final, interim);
      latest.current = text;
      callback.current(text);
      clearSilence();
      const { onSilence, silenceMs, minChars } = settings.current;
      if (onSilence && readyToSubmit(text, minChars ?? MIN_SPOKEN_CHARS))
        silence.current = setTimeout(() => {
          if (!wanted.current || latest.current !== text) return;
          onSilence(text);
        }, silenceMs ?? SILENCE_SUBMIT_MS);
    };
    instance.onerror = (event) => {
      if (recognition.current !== instance) return;
      // Pauses and our own stop() are routine in continuous mode.
      if (
        continuous &&
        (event.error === "no-speech" || event.error === "aborted")
      )
        return;
      failed = true;
      wanted.current = false;
      clearSilence();
      clearRestart();
      setError(
        STOP_ERRORS[event.error || ""] ||
          "Speech capture stopped. Review your text, then try again.",
      );
      setListening(false);
    };
    instance.onend = () => {
      if (recognition.current !== instance) return;
      // Browsers end continuous recognition after silence or a time limit.
      // Restart it, keeping the words already heard.
      if (continuous && wanted.current && !failed) {
        const now = Date.now();
        restarts.current = [
          ...restarts.current.filter((at) => now - at < RESTART_WINDOW_MS),
          now,
        ];
        quickEnds.current =
          now - startedAt < QUICK_END_MS ? quickEnds.current + 1 : 0;
        if (restarts.current.length <= MAX_RESTARTS) {
          base.current = latest.current;
          clearRestart();
          restartTimer.current = setTimeout(
            () => {
              restartTimer.current = null;
              if (wanted.current) launch();
            },
            Math.min(
              MAX_RESTART_DELAY_MS,
              RESTART_DELAY_MS * 2 ** quickEnds.current,
            ),
          );
          return;
        }
        wanted.current = false;
        clearSilence();
        setError(
          "Speech capture keeps stopping. Check your microphone, then try again.",
        );
      }
      setListening(false);
      if (!failed) ended.current?.();
    };
    recognition.current = instance;
    setListening(true);
    try {
      instance.start();
    } catch {
      wanted.current = false;
      setListening(false);
      setError("Unable to start speech capture.");
    }
  };
  // Continuous mode appends speech to `seed` (for example, typed text).
  const startWith = (seed: string) => {
    clearSilence();
    clearRestart();
    recognition.current?.abort();
    setError("");
    wanted.current = true;
    base.current = seed.trim();
    latest.current = seed.trim();
    restarts.current = [];
    quickEnds.current = 0;
    launch();
  };
  // Safe as an event handler: any event argument is ignored.
  const start = () => startWith("");
  const stop = () => {
    wanted.current = false;
    clearSilence();
    clearRestart();
    recognition.current?.stop();
    setListening(false);
  };
  return { available, listening, error, start, startWith, stop };
}
export type SpeakOptions = {
  language?: string;
  tone?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
};
// Speaks one or more lines in order with the shared natural-voice choice.
export function speakLines(lines: string[], options: SpeakOptions = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return false;
  const parts = lines.map((line) => line.trim()).filter(Boolean);
  if (!parts.length) return false;
  const language = options.language || "en-IN";
  window.speechSynthesis.cancel();
  const voice = pickVoice(language);
  parts.forEach((line, index) => {
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = language;
    if (voice) utterance.voice = voice;
    utterance.rate = options.tone === "strict" ? 1.05 : 0.96;
    if (index === 0 && options.onStart) utterance.onstart = options.onStart;
    if (index === parts.length - 1) {
      if (options.onEnd) utterance.onend = options.onEnd;
      if (options.onError) utterance.onerror = options.onError;
    }
    window.speechSynthesis.speak(utterance);
  });
  return true;
}
export function speakQuestion(
  text: string,
  language = "en-IN",
  tone = "friendly",
) {
  return speakLines([text], { language, tone });
}
