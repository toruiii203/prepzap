import { createClient } from "@supabase/supabase-js"

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  console.error(
    "[PrepZap] Missing Supabase env vars.\n" +
    "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
  )
}

// Serialize all GoTrue lock-protected calls in this tab.
// Serialize all GoTrue lock-protected calls in this tab and across tabs.
// We use navigator.locks with a strict 10s timeout to safely prevent cross-tab
// races without causing the deadlocks that native supabase-js locks suffered from.
const lockChains = new Map<string, Promise<unknown>>()

async function serialAuthLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  const executeWithTimeout = async () => {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("serialAuthLock: fn() timed out")), 10000)
      )
    ]);
  };

  if (typeof navigator !== "undefined" && navigator.locks) {
    try {
      return await navigator.locks.request(name, { mode: "exclusive", ifAvailable: false }, executeWithTimeout);
    } catch (e) {
      console.warn("navigator.locks failed, falling back to in-tab queue", e);
    }
  }

  const prev = lockChains.get(name) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  lockChains.set(name, gate)

  try {
    await prev.catch(() => {})
    return await executeWithTimeout();
  } finally {
    release()
  }
}

export const supabase = createClient(
  supabaseUrl || "https://dummy.supabase.co",
  supabaseAnon || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.anon.key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: serialAuthLock,
    },
  }
)
