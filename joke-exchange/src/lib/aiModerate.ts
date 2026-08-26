// Optional AI moderation via the Wix AI Gateway / Prompt Hub — OFF by default.
// Set AI_MODERATION=on and PROMPT_HUB_PROMPT_ID in .env.local to enable.
// Guardrails: >100 AI calls per hour, or any error/timeout (3.5s), fall back to heuristics.
import { items } from "@wix/data";
import { httpClient } from "@wix/essentials";
import { CATEGORIES, CONTENT_FLAGS } from "./jokes";
import type { Classification } from "./classify";

export const AI_MODEL = "GPT_5_4_NANO_2026_03_17";
const PROMPT_ID =
  (import.meta.env.PROMPT_HUB_PROMPT_ID as string | undefined) ||
  process.env.PROMPT_HUB_PROMPT_ID ||
  "";
const GATEWAY_URL = PROMPT_ID
  ? `https://www.wixapis.com/wix-ai-gateway/v1/generate-content-by-prompt/${PROMPT_ID}`
  : "";
const TIMEOUT_MS = 3500;
const MAX_CALLS_PER_HOUR = 100;

export interface AiModeration extends Classification {
  isJoke: boolean;
  hardBlock: boolean;
  blockReason: string;
  fixedText: string;
  moderatedBy: string;
}

export function aiEnabled(): boolean {
  return (import.meta.env.AI_MODERATION ?? process.env.AI_MODERATION) === "on";
}

/** Owner guardrail: count this hour's AI-moderated jokes; over the cap → heuristics. */
async function underHourlyCap(): Promise<boolean> {
  const hourAgo = new Date(Date.now() - 3600_000);
  const { items: recent } = await items
    .query("Jokes")
    .gt("_createdDate", hourAgo)
    .startsWith("moderatedBy", "ai:")
    .limit(MAX_CALLS_PER_HOUR + 1)
    .find();
  return recent.length < MAX_CALLS_PER_HOUR;
}

/**
 * Try the AI gate. Returns null on ANY failure (disabled, capped, timeout, auth, bad JSON)
 * — the caller then uses the heuristic classifier.
 */
export async function tryAiModerate(text: string): Promise<AiModeration | null> {
  if (!aiEnabled() || !PROMPT_ID) return null;
  try {
    if (!(await underHourlyCap())) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    // fetchWithAuth signs the request with the runtime's Wix identity (server signing) —
    // plain fetch with site/app tokens 403s on this internal endpoint.
    const res = await httpClient.fetchWithAuth(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params: { jokeText: text } }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const body = await res.json();
    // gateway returns the model output under response.* — take the first text chunk
    const raw =
      body?.response?.text ??
      body?.response?.output?.[0]?.content?.[0]?.text ??
      body?.response?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return null;
    const parsed = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());

    const category = (CATEGORIES as readonly string[]).includes(parsed.category) ? parsed.category : "other";
    const flags = Array.isArray(parsed.contentFlags)
      ? parsed.contentFlags.filter((f: string) => (CONTENT_FLAGS as readonly string[]).includes(f))
      : [];
    return {
      isJoke: Boolean(parsed.isJoke),
      hardBlock: Boolean(parsed.hardBlock),
      blockReason: typeof parsed.blockReason === "string" ? parsed.blockReason : "",
      category,
      flags,
      fixedText: typeof parsed.fixedText === "string" && parsed.fixedText.trim() ? parsed.fixedText : text,
      moderatedBy: `ai:${AI_MODEL}`,
    };
  } catch {
    return null; // fall back to heuristics — AI must never take the site down
  }
}
