import "server-only";
import { parseProviders } from "./protocol";

// Configuration is read lazily so that a missing key never breaks an unrelated
// page build. Callers check readiness and surface a recoverable error instead.

export const FRIDAY_MODEL =
  process.env.OPENROUTER_MODEL?.trim() || "deepseek/deepseek-v4.1-flash";

// Ordered provider list, comma separated. Baseten is preferred; DeepInfra is
// used only when Baseten refuses (approved 2026-10-15 after Baseten's shared
// capacity pool was exhausted). No provider outside this list is ever used,
// on any request including follow-ups inside the tool loop.
export const FRIDAY_PROVIDERS = parseProviders(process.env.OPENROUTER_PROVIDER, [
  "baseten/fp8",
  "deepinfra/fp8",
]);
export const FRIDAY_PROVIDER = FRIDAY_PROVIDERS.join(", ");

export type SpeechConfig = {
  provider: string;
  apiKey: string;
  model: string;
  voiceId?: string;
};

function speech(prefix: "STT" | "TTS"): SpeechConfig | null {
  const provider = process.env[`FRIDAY_${prefix}_PROVIDER`]?.trim();
  const apiKey = process.env[`FRIDAY_${prefix}_API_KEY`]?.trim();
  const model = process.env[`FRIDAY_${prefix}_MODEL`]?.trim();
  if (!provider || !apiKey) return null;
  return {
    provider,
    apiKey,
    model: model || "",
    voiceId: process.env.FRIDAY_TTS_VOICE_ID?.trim() || undefined,
  };
}

export const sttConfig = () => speech("STT");
export const ttsConfig = () => speech("TTS");

export function openRouterKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key ? key : null;
}

/**
 * Describes what the assistant can currently do. Safe to send to the browser:
 * it reports whether a key is present, never the key itself.
 */
export function fridayCapabilities() {
  return {
    chat: Boolean(openRouterKey()),
    model: FRIDAY_MODEL,
    provider: FRIDAY_PROVIDER,
    serverSpeechToText: Boolean(sttConfig()),
    serverTextToSpeech: Boolean(ttsConfig()),
  };
}
