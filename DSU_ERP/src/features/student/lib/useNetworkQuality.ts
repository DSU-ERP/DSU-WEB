"use client";
import { useEffect, useState } from "react";
import { classifyNetwork, type NetworkState } from "./interview-insights";
const PROBE_BYTES = 64 * 1024;
const PROBE_INTERVAL_MS = 20000;
const PROBE_TIMEOUT_MS = 10000;
// Times a small random-byte download through the student API every 20 s.
// The result is a live estimate of this connection, not a stored metric.
export function useNetworkQuality(enabled = true): NetworkState {
  const [state, setState] = useState<NetworkState>({
    state: "checking",
    label: "Checking network",
  });
  useEffect(() => {
    if (!enabled) return;
    let stopped = false,
      controller: AbortController | null = null;
    const probe = async () => {
      if (!navigator.onLine) {
        setState(classifyNetwork(null, false));
        return;
      }
      controller?.abort();
      const current = new AbortController();
      controller = current;
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        current.abort();
      }, PROBE_TIMEOUT_MS);
      const started = performance.now();
      try {
        const response = await fetch(
          `/student/api/netcheck?bytes=${PROBE_BYTES}`,
          { cache: "no-store", signal: current.signal },
        );
        // A paused or rejected probe says nothing about the connection.
        if (!response.ok) {
          await response.body?.cancel().catch(() => {});
          return;
        }
        const body = await response.arrayBuffer();
        if (!stopped)
          setState(
            classifyNetwork(
              { bytes: body.byteLength, ms: performance.now() - started },
              true,
            ),
          );
      } catch {
        // A probe aborted because a newer one started says nothing either.
        if (stopped || controller !== current) return;
        if (timedOut)
          setState({
            state: "weak",
            label: "Weak network · slow response",
            mbps: null,
            ms: null,
          });
        else if (!navigator.onLine) setState(classifyNetwork(null, false));
        else
          setState({ state: "offline", label: "Campus services unreachable" });
      } finally {
        clearTimeout(timeout);
      }
    };
    const offline = () => setState(classifyNetwork(null, false));
    void probe();
    const timer = setInterval(() => void probe(), PROBE_INTERVAL_MS);
    window.addEventListener("online", probe);
    window.addEventListener("offline", offline);
    return () => {
      stopped = true;
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener("online", probe);
      window.removeEventListener("offline", offline);
    };
  }, [enabled]);
  return state;
}
