"use client";
import { useEffect, useState } from "react";

/** Seconds since `active` became true, for long AI waits ("Analyzing… 12s"). */
export function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    setSeconds(0);
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return active && seconds >= 3 ? ` ${seconds}s` : "";
}
