/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Nebius Token Factory & NVIDIA Nemotron Engine for Studenius
 * Built for the Nebius x NVIDIA Global AI Hackathon (Best Apps and Agents Track)
 * ─────────────────────────────────────────────────────────────────────────────
 * Powers Studenius's adaptive quiz generation, high-yield concept extraction,
 * and cognitive learning paths using NVIDIA Nemotron models hosted on
 * Nebius Token Factory (with dual-failover to NVIDIA NIM inference).
 */

export interface NemotronMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface NemotronOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableThinking?: boolean;
  provider?: "nebius" | "nvidia";
}

// Nebius Token Factory endpoint (OpenAI compatible)
export const NEBIUS_API_URL =
  import.meta.env.VITE_NEBIUS_API_URL || "https://api.studio.nebius.ai/v1/chat/completions";

// NVIDIA NIM endpoint (OpenAI compatible)
export const NVIDIA_API_URL =
  import.meta.env.VITE_NVIDIA_API_URL || "https://integrate.api.nvidia.com/v1/chat/completions";

// Default Models
export const NEBIUS_NEMOTRON_MODEL =
  import.meta.env.VITE_NEBIUS_MODEL || "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF";

export const NVIDIA_NEMOTRON_MODEL =
  import.meta.env.VITE_NVIDIA_MODEL || "nvidia/nemotron-3.5-bolt-e4b";

/**
 * Resolves active API key from environment or local overrides
 */
export function getNebiusApiKey(): string {
  return (
    localStorage.getItem("pz_nebius_api_key") ||
    import.meta.env.VITE_NEBIUS_API_KEY ||
    ""
  );
}

export function getNvidiaApiKey(): string {
  return (
    localStorage.getItem("pz_nvidia_api_key") ||
    import.meta.env.VITE_NVIDIA_API_KEY ||
    ""
  );
}

/**
 * Checks if Nebius Token Factory or NVIDIA Nemotron is enabled
 */
export function isNemotronActive(): boolean {
  const nebiusKey = getNebiusApiKey();
  const nvidiaKey = getNvidiaApiKey();
  return Boolean(nebiusKey || nvidiaKey);
}

/**
 * Execute a completion against Nebius Token Factory or NVIDIA Nemotron
 */
export async function callNemotron(
  messages: NemotronMessage[] | string,
  options: NemotronOptions = {}
): Promise<{ text: string; provider: string; model: string }> {
  const normalizedMessages: NemotronMessage[] =
    typeof messages === "string"
      ? [{ role: "user", content: messages }]
      : messages;

  const nebiusKey = getNebiusApiKey();
  const nvidiaKey = getNvidiaApiKey();

  // Prefer Nebius Token Factory if configured, otherwise NVIDIA NIM
  const useNebius = options.provider === "nebius" || (nebiusKey && options.provider !== "nvidia");
  const targetUrl = useNebius ? NEBIUS_API_URL : NVIDIA_API_URL;
  const targetKey = useNebius ? nebiusKey : nvidiaKey;
  const targetModel =
    options.model ||
    (useNebius ? NEBIUS_NEMOTRON_MODEL : NVIDIA_NEMOTRON_MODEL);

  if (!targetKey) {
    throw new Error(
      "No Nebius or NVIDIA API key configured. Please set VITE_NEBIUS_API_KEY or VITE_NVIDIA_API_KEY."
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${targetKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: normalizedMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
        ...(options.enableThinking
          ? {
              chat_template_kwargs: {
                enable_thinking: true,
              },
            }
          : {}),
      }),
      signal: controller.signal,
    });

    if (!res || !res.ok) {
      const errorData = res ? await res.json().catch(() => ({})) : {};
      const msg = errorData?.error?.message || res?.statusText || "Request failed";
      throw new Error(`[${useNebius ? "Nebius" : "NVIDIA"}] API Error (${res?.status || 500}): ${msg}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    if (!content) {
      throw new Error("Received empty response from Nemotron inference.");
    }

    return {
      text: content,
      provider: useNebius ? "Nebius Token Factory" : "NVIDIA Nemotron NIM",
      model: targetModel,
    };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new Error("Nemotron model request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
