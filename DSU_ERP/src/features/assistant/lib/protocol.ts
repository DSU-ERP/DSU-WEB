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

/** Parse a comma-separated provider setting into an ordered, de-duplicated list. */
export function parseProviders(value: string | undefined, fallback: string[]): string[] {
  const list = (value ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const unique = [...new Set(list)];
  return unique.length ? unique : [...fallback];
}

/**
 * Provider routing for a request. Providers are tried in the configured order
 * and nothing outside the list is ever eligible: `only` restricts the set,
 * `order` sets the sequence, and fallbacks to other providers stay disabled.
 * Rebuilt per call so every turn in the tool loop carries the same list.
 */
export function providerRouting(providers: readonly string[]) {
  return {
    order: [...providers],
    only: [...providers],
    allowFallbacks: false as const,
  };
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

/**
 * Explain an upstream HTTP failure in words an officer can act on. The raw
 * OpenRouter body carries the real cause in error.metadata; the SDK's class
 * name ("TooManyRequestsResponseError") does not.
 */
export function explainUpstream(
  status: number,
  body: string,
  provider: string,
): string {
  let source = "";
  try {
    const parsed: unknown = JSON.parse(body);
    const meta =
      parsed && typeof parsed === "object"
        ? (parsed as { error?: { metadata?: { limit_source?: unknown } } })
            .error?.metadata
        : undefined;
    if (typeof meta?.limit_source === "string") source = meta.limit_source;
  } catch {
    // Non-JSON bodies (HTML error pages) fall through to the status message.
  }
  switch (status) {
    case 429:
      return source === "upstream_provider_shared_pool"
        ? `The model provider (${provider}) is out of capacity for this model right now. This is a shared limit across all OpenRouter users, not a problem with this account. Try again in a few minutes.`
        : "The model provider is rate-limiting requests. Wait a minute and try again.";
    case 402:
      return "The OpenRouter account has run out of credit. Add credit at openrouter.ai, then try again.";
    case 401:
    case 403:
      return "The OpenRouter key was rejected. Check OPENROUTER_API_KEY on the server.";
    case 404:
      return `The configured provider (${provider}) is not currently serving this model.`;
    case 408:
    case 502:
    case 503:
    case 504:
      return "The model provider did not respond in time. Try again shortly.";
    default:
      return `The model provider request failed with status ${status}.`;
  }
}

/**
 * Recognise an OpenRouter HTTP failure by shape rather than `instanceof`.
 * Bundlers can load the SDK's error classes more than once, and then an
 * instanceof check silently fails and the officer sees a raw class name
 * such as "UnauthorizedResponseError: User not found." instead of an
 * explanation. Every SDK HTTP error carries a numeric statusCode and the raw
 * response body, which is what the explanation actually needs.
 */
export function upstreamFailure(
  error: unknown,
): { status: number; body: string } | null {
  if (!(error instanceof Error)) return null;
  const e = error as Error & { statusCode?: unknown; body?: unknown };
  if (typeof e.statusCode !== "number") return null;
  return { status: e.statusCode, body: typeof e.body === "string" ? e.body : "" };
}
