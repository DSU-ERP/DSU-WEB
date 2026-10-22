// Shared speech-synthesis voice selection for Friday and the AI interviewer.
// The closest language match always wins (exact, then a regional variant,
// then the same language), so Friday keeps its British voice and the
// interviewer keeps the configured accent. Within a tier, natural/neural
// voices are preferred over the older robotic ones.
export type VoiceLike = {
  name: string;
  lang: string;
  default?: boolean;
};

const NATURAL = /\b(natural|neural|online|premium|enhanced|wavenet)\b/i;
const FAMILIAR = /\b(google|microsoft|siri|samantha|daniel|karen|moira|rishi|veena)\b/i;
const normal = (lang: string) => (lang || "").toLowerCase().replace(/_/g, "-");

export function chooseVoice<T extends VoiceLike>(
  voices: readonly T[],
  lang: string,
): T | null {
  const wanted = normal(lang);
  const family = wanted.split("-")[0];
  let best: T | null = null,
    bestScore = -1;
  for (const voice of voices) {
    const voiceLang = normal(voice.lang);
    let score =
      voiceLang === wanted
        ? 100
        : voiceLang.startsWith(wanted + "-")
          ? 80
          : voiceLang === family || voiceLang.startsWith(family + "-")
            ? 40
            : -1;
    if (score < 0) continue;
    if (NATURAL.test(voice.name)) score += 30;
    else if (FAMILIAR.test(voice.name)) score += 10;
    if (voice.default) score += 1;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

// Voices load asynchronously; until they arrive the browser default is used.
export function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return null;
  return chooseVoice(window.speechSynthesis.getVoices(), lang);
}
