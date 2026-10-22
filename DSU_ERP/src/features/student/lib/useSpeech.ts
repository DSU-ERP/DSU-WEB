"use client";
import { useEffect, useRef, useState } from "react";
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
export function useSpeechInput(
  onText: (text: string) => void,
  language = "en-IN",
  onEnd?: () => void,
) {
  const [available, setAvailable] = useState(false),
    [listening, setListening] = useState(false),
    [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null),
    callback = useRef(onText);
  callback.current = onText;
  const ended = useRef(onEnd);
  ended.current = onEnd;
  const constructor = () => {
    const browser = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    return browser.SpeechRecognition || browser.webkitSpeechRecognition;
  };
  useEffect(() => {
    setAvailable(!!constructor());
    return () => recognition.current?.abort();
  }, []);
  const start = () => {
    const Constructor = constructor();
    if (!Constructor) {
      setError(
        "Speech recognition is unavailable in this browser. You can type your answer.",
      );
      return;
    }
    setError("");
    let failed = false;
    const instance = new Constructor();
    instance.lang = language;
    instance.continuous = false;
    instance.interimResults = true;
    instance.onresult = (event) => {
      const result = event as {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      };
      callback.current(
        Array.from(result.results)
          .map((item) => item[0]?.transcript || "")
          .join(" ")
          .trim(),
      );
    };
    instance.onerror = (event) => {
      failed = true;
      setError(
        event.error === "not-allowed"
          ? "Microphone permission was declined. You can type instead."
          : "Speech capture stopped. Review or type your text.",
      );
      setListening(false);
    };
    instance.onend = () => {
      setListening(false);
      if (!failed) ended.current?.();
    };
    recognition.current = instance;
    setListening(true);
    try {
      instance.start();
    } catch {
      setListening(false);
      setError("Unable to start speech capture.");
    }
  };
  const stop = () => {
    recognition.current?.stop();
    setListening(false);
  };
  return { available, listening, error, start, stop };
}
export function speakQuestion(
  text: string,
  language = "en-IN",
  tone = "friendly",
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = tone === "strict" ? 1.05 : 0.96;
  window.speechSynthesis.speak(utterance);
  return true;
}
