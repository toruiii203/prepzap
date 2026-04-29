// ─── Groq API helper ──────────────────────────────────────────────────────────
// Requests are proxied through a Cloudflare Worker to avoid CORS issues.
// The API key lives in the Worker secret — not exposed in the frontend.
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_API_URL = "/api/groq";

const DEFAULT_MODEL  = "llama-3.3-70b-versatile";
const VISION_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct"; // Groq vision model

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{type: string; [key: string]: unknown}>;
}

export async function callGroq(
  messages: GroqMessage[],
  systemPrompt?: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024
): Promise<string> {
  // Auto-detect active image sources and inject them into the last user message
  const { buildImageMessages } = await import("@/lib/sourceContext")
  const imageBlocks = buildImageMessages()
  const hasImages = imageBlocks.length > 0

  const fullMessages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...messages.map((m, i) => {
      // Inject images into the last user message
      if (hasImages && i === messages.length - 1 && m.role === "user") {
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
