// Pure helpers shared by the server engine and the browser component.
// Deliberately free of "server-only" so they can be unit tested directly.

export type Usage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type ToolCallFragment = {
  index: number;
  id?: string | undefined;
  function?: { name?: string | undefined; arguments?: string | undefined } | undefined;
};

export type AssembledCall = { id: string; name: string; args: string };

/**
 * Provider routing for a request. Rebuilt per call so every turn in the tool
 * loop carries the same pinned provider with fallbacks disabled.
 */
export function providerRouting(provider: string) {
  return { only: [provider], allowFallbacks: false as const };
}

/**
 * Streamed tool calls arrive fragmented: the name and the JSON arguments are
 * split across chunks and identified only by index. Concatenate per index in
 * arrival order.
 */
export function assembleToolCalls(
  fragments: Iterable<ToolCallFragment>,
): AssembledCall[] {
  const slots = new Map<number, AssembledCall>();
  for (const f of fragments) {
    const slot = slots.get(f.index) ?? { id: "", name: "", args: "" };
    if (f.id) slot.id = f.id;
    if (f.function?.name) slot.name += f.function.name;
    if (f.function?.arguments) slot.args += f.function.arguments;
    slots.set(f.index, slot);
  }
  // A call without an id or name cannot be answered and is dropped.
  return [...slots.values()].filter((s) => s.id && s.name);
}

/** Parse assembled arguments, rejecting anything that is not a JSON object. */
export function parseToolArguments(
  raw: string,
): { ok: true; args: Record<string, unknown> } | { ok: false } {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return { ok: true, args: parsed as Record<string, unknown> };
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * Absent usage is unavailable, never zero. A zero would read as a real
 * measurement rather than a missing one.
 */
export function normalizeUsage(u: {
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
}): Usage {
  const n = (v: number | null | undefined) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    promptTokens: n(u.promptTokens),
    completionTokens: n(u.completionTokens),
    totalTokens: n(u.totalTokens),
  };
}

/**
 * Strip Markdown, code blocks and URLs so speech synthesis never reads
 * punctuation or link text aloud.
 */
export function speakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^\s*[#>-]+\s*/gm, "")
    .replace(/\|/g, " ")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split into whole sentences so queued audio plays in order. */
export function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [text])
    .map((s) => s.trim())
    .filter(Boolean);
}
