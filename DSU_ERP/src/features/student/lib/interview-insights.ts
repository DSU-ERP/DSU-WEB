// Pure helpers for the interview room and report. No React or browser
// globals, so they can be unit tested. Relative type import only: the unit
// test build does not resolve the "@/" alias.
import type {
  AnswerFeedback,
  Dimension,
} from "./interview-types";

export const DIMENSION_LABELS: Record<Dimension, string> = {
  overall: "Overall",
  relevance: "Relevance",
  clarity: "Clarity",
  structure: "Structure",
  specificity: "Specificity",
  roleFit: "Role fit",
  depth: "Depth",
  accuracy: "Accuracy",
  communication: "Communication",
  confidence: "Confidence",
  conciseness: "Conciseness",
};
export const DIMENSIONS = Object.keys(DIMENSION_LABELS) as Dimension[];
export const QUALITY_LEVELS = [
  "Poor",
  "Basic",
  "Good",
  "Strong",
  "Placement-ready",
] as const;

type FeedbackLike = Partial<AnswerFeedback> | null | undefined;

// Feedback saved before turn judgements existed was always a scored answer.
export function isScoredFeedback(feedback: FeedbackLike) {
  return !!feedback?.scores && feedback.turn?.scored !== false;
}

// The dimensions this feedback actually scored, in display order.
export function scoredDimensions(feedback: FeedbackLike) {
  const scores = (feedback?.scores || {}) as Partial<Record<Dimension, number>>;
  return DIMENSIONS.flatMap((key) =>
    typeof scores[key] === "number"
      ? [{ key, label: DIMENSION_LABELS[key], value: scores[key] as number }]
      : [],
  );
}

// "Excellent" is the top level of the earlier four-level scale.
export function qualityRank(quality: string | null | undefined) {
  if (!quality) return null;
  if (quality === "Excellent") return QUALITY_LEVELS.length - 1;
  const rank = QUALITY_LEVELS.indexOf(quality as (typeof QUALITY_LEVELS)[number]);
  return rank < 0 ? null : rank;
}

export type DimensionChange = {
  key: Dimension;
  label: string;
  before: number;
  after: number;
  change: number;
};

// Compares an original answer's feedback with its practice retry. Only
// dimensions scored in both are compared; nothing is estimated.
export function compareFeedback(original: FeedbackLike, retry: FeedbackLike) {
  if (!isScoredFeedback(original) || !isScoredFeedback(retry)) return null;
  const before = new Map(
    scoredDimensions(original).map((item) => [item.key, item.value]),
  );
  const dimensions: DimensionChange[] = scoredDimensions(retry).flatMap(
    (item) =>
      before.has(item.key)
        ? [
            {
              key: item.key,
              label: item.label,
              before: before.get(item.key) as number,
              after: item.value,
              change:
                Math.round((item.value - (before.get(item.key) as number)) * 10) /
                10,
            },
          ]
        : [],
  );
  const from = qualityRank(original?.quality),
    to = qualityRank(retry?.quality);
  return {
    dimensions,
    quality: {
      before: original?.quality ?? null,
      after: retry?.quality ?? null,
      direction:
        from === null || to === null
          ? ("unknown" as const)
          : to > from
            ? ("up" as const)
            : to < from
              ? ("down" as const)
              : ("same" as const),
    },
  };
}

export type NetworkSample = { bytes: number; ms: number };
export type NetworkState =
  | { state: "offline"; label: string }
  | { state: "checking"; label: string }
  | {
      state: "weak" | "good";
      label: string;
      mbps: number | null;
      ms: number | null;
    };

export const WEAK_MBPS = 2;

// Throughput from one timed probe download. Below 2 Mbps is "weak".
export function classifyNetwork(
  sample: NetworkSample | null,
  online: boolean,
): NetworkState {
  if (!online) return { state: "offline", label: "Offline" };
  if (!sample || !(sample.ms > 0) || !(sample.bytes > 0))
    return { state: "checking", label: "Checking network" };
  const mbps =
    Math.round(((sample.bytes * 8) / (sample.ms / 1000) / 1_000_000) * 10) /
    10;
  const ms = Math.round(sample.ms);
  return mbps < WEAK_MBPS
    ? { state: "weak", label: `Weak network · ${mbps} Mbps`, mbps, ms }
    : { state: "good", label: `${mbps} Mbps`, mbps, ms };
}

export type TrackLike = {
  readyState: string;
  enabled: boolean;
  muted: boolean;
};

// A source is healthy when at least one of its tracks is live, enabled and
// receiving media (not muted by the browser or operating system).
export function tracksHealthy(tracks: readonly TrackLike[] | null | undefined) {
  return !!tracks?.some(
    (track) => track.readyState === "live" && track.enabled && !track.muted,
  );
}

// Screen sharing is healthy while its track is live. Chrome mutes a display
// capture track while the shared content is static or a captured window is
// minimised, so `muted` is not a failure here; only the student stopping
// the share (readyState "ended") is.
export function sharingActive(tracks: readonly TrackLike[] | null | undefined) {
  return !!tracks?.some((track) => track.readyState === "live");
}

// Labels for a session's questions: main questions are numbered 1..n and a
// follow-up carries its parent's number ("Follow-up to question 2").
export function questionLabels(
  questions: readonly { parent?: number | null }[] | null | undefined,
) {
  const numbers: number[] = [];
  let main = 0;
  return (questions || []).map((item, index) => {
    const parent =
      typeof item.parent === "number" && item.parent < index ? item.parent : null;
    numbers[index] = parent === null ? ++main : numbers[parent];
    return { number: numbers[index], followUp: parent !== null };
  });
}

// Reports a media failure only after `threshold` consecutive unhealthy polls
// and only once per failure episode; recovering starts a new episode.
export function createHealthMonitor(threshold = 2) {
  const failures = new Map<string, number>();
  return (key: string, healthy: boolean) => {
    if (healthy) {
      failures.delete(key);
      return false;
    }
    const count = (failures.get(key) || 0) + 1;
    failures.set(key, count);
    return count === threshold;
  };
}

export const INTEGRITY_LABELS: Record<string, string> = {
  "tab-hidden": "the interview tab was hidden",
  "focus-lost": "the interview window lost focus",
  "fullscreen-exit": "fullscreen was exited",
  "screen-stopped": "screen sharing stopped or was paused",
  "camera-stopped": "the camera stopped or was disabled",
  "mic-stopped": "the microphone stopped or was muted",
  clipboard: "a clipboard action was blocked",
  inactive: "no keyboard, pointer or speech input for 45 seconds",
  "extended-display": "an extended display is connected",
  "context-menu": "the context menu was blocked",
  "drag-drop": "dragging or dropping content was blocked",
  "navigation-attempt": "a browser navigation shortcut was blocked",
  "restricted-window": "the interview no longer covers the full screen",
  "picture-in-picture": "picture-in-picture was opened",
};
