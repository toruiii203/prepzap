// ─── Groq API helper ──────────────────────────────────────────────────────────
// Requests are proxied through a Cloudflare Worker to avoid CORS issues.
// The API key lives in the Worker secret — not exposed in the frontend.
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://groq-proxy.alfonsomigs03.workers.dev";

const DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free";
const VISION_MODEL  = "google/gemini-2.0-flash-exp:free";

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

// ─── Model detection helpers ──────────────────────────────────────────────────
const MODEL_PREFIXES = ["llama", "gemma", "mixtral", "mistral", "deepseek", "qwen", "meta-llama", "google", "anthropic", "openai"];

function looksLikeModel(s: string): boolean {
  return MODEL_PREFIXES.some(p => s.toLowerCase().startsWith(p));
}

// ─── Main callGroq ────────────────────────────────────────────────────────────
export async function callGroq(
  messages: GroqMessage[] | string,
  systemPromptOrModel?: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024
): Promise<string> {
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
    normMessages = messages;
    if (systemPromptOrModel && looksLikeModel(systemPromptOrModel) && model === DEFAULT_MODEL) {
      model = systemPromptOrModel;
      systemPrompt = undefined;
    } else {
      systemPrompt = systemPromptOrModel;
    }
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

  const resolvedModel = hasImages ? VISION_MODEL : model;
  const isOpenRouterModel = true; // Always route through OpenRouter

  console.log(
    "[groq] sending request, model:", resolvedModel,
    "messages count:", fullMessages.length,
    "first msg role:", fullMessages[0]?.role
  );

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: resolvedModel,
      max_tokens: maxTokens,
      messages: fullMessages,
      temperature: 0.7,
      ...(isOpenRouterModel ? { route: "openrouter" } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[groq] API error:", res.status, err);
    throw new Error(
      `Groq API error ${res.status}: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();

  // Guard: malformed or empty response structure
  if (!data?.choices?.length) {
    console.error("[groq] Unexpected response structure:", JSON.stringify(data));
    throw new Error("Empty or invalid response from AI model. Please try again.");
  }

  const result: string = data.choices[0]?.message?.content ?? "";
  console.log("[groq] response received, length:", result.length, result.length === 0 ? "⚠️ EMPTY RESPONSE" : "✓");

  if (result.length === 0) {
    throw new Error("AI returned an empty response. Please try again.");
  }

  return result;
}

// ─── Vision-specific helper ───────────────────────────────────────────────────
export async function callGroqWithImages(
  textPrompt: string,
  imageBlocks: Array<{ type: string; source: { type: string; media_type: string; data: string } }>,
  systemPrompt?: string,
  maxTokens: number = 1024
): Promise<string> {
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

  // FIX: was incorrectly referencing `hasImages` and `model` from callGroq scope
  console.log("[groq] sending vision request, model:", VISION_MODEL, "messages count:", messages.length);

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: maxTokens,
      messages,
      temperature: 0.7,
    }),
  });

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
