"use server";
import { OpenRouter } from "@openrouter/sdk";
import { workspaceAccess } from "@/shared/auth/workspace";
import { CampusError } from "@/shared/http/errors";
import { FRIDAY_MODEL, FRIDAY_PROVIDERS, openRouterKey } from "@/features/assistant/lib/config";
import { providerRouting } from "@/features/assistant/lib/protocol";

const MAX_INPUT = 3000;
const INSTRUCTIONS = `You tidy a student's list of case competitions and certifications for a placement profile.
Rewrite it as a short list, one entry per line, in this exact form:
Name — Issuer or organiser (Year) — Result
Rules:
- Keep only the name, the issuer/organiser, the year and the result or rank. Drop descriptions, adjectives and anything else.
- Omit any part the student did not give. Never invent, guess or add names, issuers, years or results.
- Fix spelling and capitalisation of well-known names only.
- Remove duplicates. Keep the student's order.
- Output only the list: no heading, numbering, bullets, quotes or commentary.
- If the text contains no competitions or certifications, output nothing.`;

/** Tidies the "Case competitions and certifications" field with AI. Students
 * only; the result is returned for review and saved only when they save. */
export async function enhanceCertifications(text: string): Promise<{ text?: string; error?: string }> {
  try {
    const access = await workspaceAccess();
    if (access.role !== "student") return { error: "Only students can use this." };
  } catch (error) {
    if (error instanceof CampusError) return { error: "Sign in again to use this." };
    throw error;
  }
  const input = String(text ?? "").trim();
  if (!input) return { error: "Add your competitions or certifications first." };
  if (input.length > MAX_INPUT) return { error: `Keep this under ${MAX_INPUT} characters.` };
  const apiKey = openRouterKey();
  if (!apiKey) return { error: "AI tidy-up is not available right now." };
  try {
    const response = await new OpenRouter({ apiKey }).chat.send(
      {
        chatRequest: {
          model: FRIDAY_MODEL,
          messages: [
            { role: "system", content: INSTRUCTIONS },
            { role: "user", content: input },
          ],
          stream: false,
          provider: providerRouting(FRIDAY_PROVIDERS),
          maxTokens: 600,
          temperature: 0.1,
        },
      },
      { signal: AbortSignal.timeout(30000) },
    );
    if (Symbol.asyncIterator in response) return { error: "AI tidy-up failed. Try again." };
    const content = response.choices?.[0]?.message?.content;
    const tidied = (typeof content === "string" ? content : "")
      .split("\n")
      .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
      .filter(Boolean)
      .join("\n")
      .slice(0, MAX_INPUT);
    if (!tidied) return { error: "No competitions or certifications were found to tidy." };
    return { text: tidied };
  } catch {
    return { error: "AI tidy-up failed. Try again." };
  }
}
