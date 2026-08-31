// ─── Groq API helper ──────────────────────────────────────────────────────────
// Requests are proxied through a Cloudflare Worker to avoid CORS issues.
// The API key lives in the Worker secret — not exposed in the frontend.
// ─────────────────────────────────────────────────────────────────────────────
import { getCachedAccessToken } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const GROQ_API_URL = import.meta.env.VITE_GROQ_PROXY_URL || "https://groq-proxy.YOUR_DOMAIN.workers.dev";
// API key removed for security; requests are routed through Cloudflare Worker
const DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct";
const VISION_MODEL = "google/gemini-flash-1.5-8b";

function getTieredModel(model: string): string {
  return model;
}

// FIX (auth 401s): This previously called supabase.auth.getSession() FIRST on
// every request, racing it against a timeout. getSession() has a confirmed
// deadlock failure mode (Web Locks contention across tabs), and on timeout the
// old code silently proceeded with NO auth token — which the Worker correctly
// rejects with 401. That was the exact "Groq API error 401" bug; the token was
// never being sent, not invalid.
//
// Fix: check AuthContext's in-memory cache (getCachedAccessToken) FIRST. It's
// a synchronous read, can't deadlock, and can't time out — it's kept fresh by
// AuthProvider on every auth state change, including background token
// refreshes (see AuthContext.tsx). By the time any Groq call fires, the cache
// is populated in the overwhelming majority of cases.
//
// The getSession() race is kept as a fallback ONLY for the brief window before
// AuthProvider's initial getSession() call has resolved (e.g. a Groq call
// firing immediately on page load, before the cache exists yet).
async function getAccessTokenSafely(): Promise<string> {
  // 1. Cache-first: synchronous, can't deadlock, always at least as fresh as a
  //    direct getSession() call would be.
  const cached = getCachedAccessToken();
  if (cached) return cached;

  // 2. localStorage cache — available synchronously even before AuthProvider
  //    has resolved its async initialize(). This is the key fix for the 401-
  //    on-startup race: on a cold PWA load the in-memory cache (#1) is empty
  //    but localStorage already has the last known-good token. Checking here
  //    means the first AI call on a fresh page load always has a token,
  //    instead of falling through to getSession() which can time out.
  try {
    const raw = localStorage.getItem("pz_auth_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.session?.access_token;
      if (token) {
        // Decode the JWT exp claim (middle segment, base64url) and check if
        // the token is still valid with a 60-second safety buffer. Supabase
        // access tokens expire after 1 hour regardless of the refresh-token
        // lifetime — sending an expired token is the direct cause of the
        // recurring 401s. If it's expired (or close to it), fall through to
        // getSession() which will use the long-lived refresh token to get a
        // fresh access token automatically.
        try {
          const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
          const expiresAt = payload?.exp ?? 0; // Unix seconds
          const nowSec = Math.floor(Date.now() / 1000);
          if (expiresAt - nowSec > 60) {
            return token; // Token is fresh — use it
          }
          // Token expired or expiring soon — fall through to refresh
        } catch {
          return token; // Can't decode? Try it anyway — better than nothing
        }
      }
    }
  } catch (e) {}

  // 3. Last resort: call getSession() for the narrow window where localStorage
  //    is also empty (e.g. brand-new login before any cache has been written).
  try {
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 2000)
      ),
    ]);
    if (!error && data?.session?.access_token) {
      return data.session.access_token;
    }
  } catch (err) {
    console.warn("getSession timeout/error in Groq helper:", err);
  }

  return "";
}

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

// ─── Shared JSON parser used by all pages ─────────────────────────────────────
// Strips markdown fences, extracts the first JSON object or array,
// and throws a clear error if nothing parseable is found.
export function safeParseJSON<T = unknown>(raw: string): T {
  // 1. Strip code fences
  let clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // 2. Try to extract a JSON object or array
  const objMatch = clean.match(/\{[\s\S]*\}/);
  const arrMatch = clean.match(/\[[\s\S]*\]/);

  // Prefer whichever appears first in the string
  let jsonStr = clean;
  if (objMatch && arrMatch) {
    jsonStr = raw.indexOf("{") < raw.indexOf("[") ? objMatch[0] : arrMatch[0];
  } else if (objMatch) {
    jsonStr = objMatch[0];
  } else if (arrMatch) {
    jsonStr = arrMatch[0];
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    console.error("[safeParseJSON] Failed to parse. Raw response:", raw);
    throw new Error("AI returned malformed JSON. Please try again.");
  }
}

// ─── Model detection helpers ───────────────────────────────────────────────────
const MODEL_PREFIXES = ["llama", "gemma", "gemini", "mixtral", "mistral", "deepseek", "qwen", "meta-llama", "google", "anthropic", "openai"];

function looksLikeModel(s: string): boolean {
  return MODEL_PREFIXES.some(p => s.toLowerCase().startsWith(p));
}

// ─── Main callGroq ─────────────────────────────────────────────────────────────
// Internal core — does the actual normalization, fetch, and parsing.
// Returns both the text AND which provider actually answered (Groq / Gemini /
// Cloudflare AI / OpenRouter), since the Worker falls back silently between
// providers and that fallback was invisible before this change.

// Low-level fetch helper: sends a pre-built message array with a known-good token.
// Used both for normal calls and the 401-retry path (where we bypass the cache).
async function _callGroqCoreWithToken(
  fullMessages: GroqMessage[],
  resolvedModel: string,
  maxTokens: number,
  feature: string | undefined,
  token: string
): Promise<{ text: string; provider?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  let res: Response;
  try {
    res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        max_tokens: maxTokens,
        messages: fullMessages,
        temperature: 0.7,
        ...(feature ? { feature } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new Error("Rex took too long to respond (request timed out). Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[groq] API error:", res.status, err);
    throw new Error(
      `Groq API error ${res.status}: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();

  // Handle both Gemini format and OpenAI/OpenRouter format
  let result: string = "";
  if (data?.candidates?.length) {
    result = data.candidates[0]?.content?.parts?.[0]?.text ?? "";
    const finishReason = data.candidates[0]?.finishReason;
    if (result.length === 0 && finishReason && finishReason !== "STOP") {
      console.error("[groq] Gemini returned no text, finishReason:", finishReason);
      throw new Error(
        finishReason === "SAFETY" || finishReason === "RECITATION"
          ? "Rex couldn't answer that one — it may have tripped a content filter. Try rephrasing your question."
          : `Rex couldn't finish that response (${finishReason}). Please try again.`
      );
    }
  } else if (data?.choices?.length) {
    result = data.choices[0]?.message?.content ?? "";
  } else {
    console.error("[groq] Unexpected response structure:", JSON.stringify(data));
    throw new Error("Empty or invalid response from AI model. Please try again.");
  }

  if (!result) {
    throw new Error("Rex returned an empty response. Please try again.");
  }

  console.log(
    "[groq] response received, length:", result.length, "✓",
    "provider:", data?._provider ?? "unknown"
  );

  return { text: result, provider: data._provider };
}

async function _callGroqCore(
  messages: GroqMessage[] | string,
  systemPromptOrModel?: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024,
  feature?: string,
  isRetry: boolean = false
): Promise<{ text: string; provider?: string }> {
  // Fail fast and clearly when there's genuinely no connection, instead of
  // sending a doomed request that surfaces as a confusing error later.
  // AI features fundamentally need the network — there's no local model to
  // fall back to — so this is the correct behavior, not a workaround.
  if (!navigator.onLine) {
    throw new Error("You're offline — Rex needs an internet connection to respond. Your other tools (Flashcards, Practice, Mistake Journal) still work offline.");
  }

  // Normalise overloaded arguments
  let normMessages: GroqMessage[];
  let systemPrompt: string | undefined;

  if (typeof messages === "string") {
    normMessages = [{ role: "user", content: messages }];
    if (systemPromptOrModel && looksLikeModel(systemPromptOrModel)) {
      model = systemPromptOrModel;
      systemPrompt = undefined;
    } else {
      systemPrompt = systemPromptOrModel;
    }
  } else {
    // messages is already an array — systemPromptOrModel is always a system prompt here.
    // Model comes in as the explicit 3rd argument; no detection needed.
    normMessages = messages;
    systemPrompt = systemPromptOrModel;
  }

  // Auto-detect active image sources and inject into the last user message
  const { buildImageMessages } = await import("@/lib/sourceContext");
  const imageBlocks = buildImageMessages();
  const hasImages = imageBlocks.length > 0;

  const fullMessages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...normMessages.map((m, i) => {
      if (hasImages && i === normMessages.length - 1 && m.role === "user") {
        const textContent = typeof m.content === "string" ? m.content : "";
        return {
          role: "user" as const,
          content: [
            ...imageBlocks.map(img => ({
              type: "image_url",
              image_url: { url: `data:${img.source.media_type};base64,${img.source.data}` },
            })),
            { type: "text", text: textContent },
          ],
        };
      }
      return m;
    }),
  ];

  const resolvedModel = getTieredModel(hasImages ? VISION_MODEL : model);

  console.log(
    "[groq] sending request, model:", resolvedModel,
    "messages count:", fullMessages.length,
    "first msg role:", fullMessages[0]?.role
  );

  const token = await getAccessTokenSafely();

  try {
    return await _callGroqCoreWithToken(fullMessages, resolvedModel, maxTokens, feature, token);
  } catch (err: any) {
    // FIX: On 401, force a token refresh and retry ONCE using the fresh token
    // DIRECTLY from refreshSession()'s return value. Do NOT re-call
    // getAccessTokenSafely() here — the in-memory and localStorage caches
    // may not have updated yet, so reading from them again would just send
    // the same stale token and cause a second 401.
    if (err?.message?.includes("401") && !isRetry) {
      console.warn("[groq] API returned 401, forcing token refresh and retrying...");
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        const freshToken = refreshData?.session?.access_token;
        if (!refreshError && freshToken) {
          console.log("[groq] Token refreshed successfully, retrying with fresh token...");
          return await _callGroqCoreWithToken(fullMessages, resolvedModel, maxTokens, feature, freshToken);
        }
        console.error("[groq] refreshSession returned no token:", refreshError);
      } catch (refreshErr) {
        console.error("[groq] Failed to refresh token during 401 retry:", refreshErr);
      }
    }

    // Re-throw the original error so callers get a clear message
    throw err;
  }
}

// Public helper — same signature and return type as before (a plain string).
// Every existing call site keeps working unchanged.
export async function callGroq(
  messages: GroqMessage[] | string,
  systemPromptOrModel?: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024,
  feature?: string
): Promise<string> {
  const { text } = await _callGroqCore(messages, systemPromptOrModel, model, maxTokens, feature);
  return text;
}

// Public helper for call sites that want to know which provider actually
// answered (e.g. to log it for debugging quality issues like silent
// fallback to a weaker model). Same args as callGroq.
export async function callGroqWithMeta(
  messages: GroqMessage[] | string,
  systemPromptOrModel?: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024,
  feature?: string
): Promise<{ text: string; provider?: string }> {
  return _callGroqCore(messages, systemPromptOrModel, model, maxTokens, feature);
}

// ─── Vision-specific helper ─────────────────────────────────────────────────────
export async function callGroqWithImages(
  textPrompt: string,
  imageBlocks: Array<{ type: string; source: { type: string; media_type: string; data: string } }>,
  systemPrompt?: string,
  maxTokens: number = 1024
): Promise<string> {
  if (!navigator.onLine) {
    throw new Error("You're offline — Rex needs an internet connection to respond.");
  }

  const userContent: Array<{ type: string; [key: string]: unknown }> = [
    ...imageBlocks.map(img => ({
      type: "image_url",
      image_url: { url: `data:${img.source.media_type};base64,${img.source.data}` },
    })),
    { type: "text", text: textPrompt },
  ];

  const messages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    { role: "user" as const, content: userContent },
  ];

  console.log("[groq] sending vision request, model:", VISION_MODEL, "messages count:", messages.length);

  // FIX: fetch the token ONCE and reuse it (was fetched twice — once here,
  // once again inside the headers object below).
  const visionToken = await getAccessTokenSafely();
  const visionController = new AbortController();
  const visionTimeoutId = setTimeout(() => visionController.abort(), 45000);

  let res: Response;
  try {
    res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${visionToken}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: maxTokens,
        messages,
        temperature: 0.7,
      }),
      signal: visionController.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new Error("Rex took too long to respond (request timed out). Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(visionTimeoutId);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Groq Vision API error ${res.status}: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();

  // Guard: malformed or empty response structure
  if (!data?.choices?.length) {
    console.error("[groq] Unexpected vision response structure:", JSON.stringify(data));
    throw new Error("Empty or invalid response from vision model. Please try again.");
  }

  const result: string = data.choices[0]?.message?.content ?? "";
  console.log("[groq] response received, length:", result.length, result.length === 0 ? "⚠️ EMPTY RESPONSE" : "✓");

  if (result.length === 0) {
    throw new Error("Vision model returned an empty response. Please try again.");
  }

  return result;
}