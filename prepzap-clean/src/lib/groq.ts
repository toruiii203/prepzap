// ─── Groq API helper ──────────────────────────────────────────────────────────
// Requests are proxied through a Cloudflare Worker to avoid CORS issues.
// The API key lives in the Worker secret — not exposed in the frontend.
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://groq-proxy.alfonsomigs03.workers.dev";

const DEFAULT_MODEL  = "llama-3.3-70b-versatile";
const VISION_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct"; // Groq vision model

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{type: string; [key: string]: unknown}>;
}

// Known model name substrings — used to detect when a model string is passed
// as the second argument instead of a systemPrompt.
const MODEL_PREFIXES = ["llama", "gemma", "mixtral", "mistral", "deepseek", "qwen", "meta-llama"];

function looksLikeModel(s: string): boolean {
  return MODEL_PREFIXES.some(p => s.toLowerCase().startsWith(p));
}

export async function callGroq(
  messages: GroqMessage[] | string,
  systemPromptOrModel?: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024
): Promise<string> {
  // ── Normalise overloaded arguments ──────────────────────────────────────────
  // Legacy callers pass:  callGroq(promptString, "llama-3.3-70b-versatile")
  // Correct callers pass: callGroq([{role,content}], systemPrompt, model, maxTokens)
  let normMessages: GroqMessage[];
  let systemPrompt: string | undefined;

  if (typeof messages === "string") {
    // First arg is a plain string prompt → wrap it
    normMessages = [{ role: "user", content: messages }];
    if (systemPromptOrModel && looksLikeModel(systemPromptOrModel)) {
      // Second arg is actually a model name
      model = systemPromptOrModel;
      systemPrompt = undefined;
    } else {
      systemPrompt = systemPromptOrModel;
    }
  } else {
    normMessages = messages;
    if (systemPromptOrModel && looksLikeModel(systemPromptOrModel) && model === DEFAULT_MODEL) {
      // Caller accidentally passed model as systemPrompt slot
      model = systemPromptOrModel;
      systemPrompt = undefined;
    } else {
      systemPrompt = systemPromptOrModel;
    }
  }
  // ────────────────────────────────────────────────────────────────────────────
  // Auto-detect active image sources and inject them into the last user message
  const { buildImageMessages } = await import("@/lib/sourceContext")
  const imageBlocks = buildImageMessages()
  const hasImages = imageBlocks.length > 0

  const fullMessages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...normMessages.map((m, i) => {
      // Inject images into the last user message
      if (hasImages && i === normMessages.length - 1 && m.role === "user") {
        const textContent = typeof m.content === "string" ? m.content : ""
        return {
          role: "user" as const,
          content: [
            ...imageBlocks.map(img => ({
              type: "image_url",
              image_url: { url: `data:${img.source.media_type};base64,${img.source.data}` }
            })),
            { type: "text", text: textContent }
          ]
        }
      }
      return m
    }),
  ]

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: hasImages ? VISION_MODEL : model,
      max_tokens: maxTokens,
      messages: fullMessages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Groq API error ${res.status}: ${(err as {error?: {message?: string}}).error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Call Groq with vision support — pass image content blocks alongside text.
 * Automatically switches to the vision model when images are present.
 */
export async function callGroqWithImages(
  textPrompt: string,
  imageBlocks: Array<{type: string; source: {type: string; media_type: string; data: string}}>,
  systemPrompt?: string,
  maxTokens: number = 1024
): Promise<string> {
  // Build multimodal user message
  const userContent: Array<{type: string; [key: string]: unknown}> = [
    ...imageBlocks.map(img => ({
      type: "image_url",
      image_url: {
        url: `data:${img.source.media_type};base64,${img.source.data}`
      }
    })),
    { type: "text", text: textPrompt }
  ]

  const messages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    { role: "user" as const, content: userContent }
  ]

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
      `Groq Vision API error ${res.status}: ${(err as {error?: {message?: string}}).error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
