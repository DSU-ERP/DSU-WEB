// Pure helpers for continuous speech capture. Kept free of browser APIs so
// they can be unit tested.
export const SILENCE_SUBMIT_MS = 2200;
// Interview turns have a deliberate thinking pause, separate from chat dictation.
export const INTERVIEW_SILENCE_SUBMIT_MS = 5000;
export const MIN_SPOKEN_CHARS = 12;

export type RecognitionResultLike = ArrayLike<{ transcript: string }> & {
  isFinal?: boolean;
};

export function joinSpeech(...parts: string[]) {
  return parts
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
}

// Final results are settled text; interim results may still change.
export function splitTranscript(results: ArrayLike<RecognitionResultLike>) {
  let final = "",
    interim = "";
  for (const result of Array.from(results)) {
    const text = result[0]?.transcript || "";
    if (result.isFinal) final = joinSpeech(final, text);
    else interim = joinSpeech(interim, text);
  }
  return { final, interim };
}

export function readyToSubmit(text: string, minChars = MIN_SPOKEN_CHARS) {
  return text.trim().length >= minChars;
}
