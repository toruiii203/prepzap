import { createClient } from "@supabase/supabase-js"

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  console.error(
    "[PrepZap] Missing Supabase env vars.\n" +
    "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
  )
}

// Workaround for Supabase Web Locks deadlock bug that prevents background token 
// refreshes and causes getSession() timeouts. This forces the legacy lock path
// but immediately resolves, completely bypassing the problematic Web Locks.
const dummyLock = async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await fn();
};

export const supabase = createClient(
  supabaseUrl || "https://dummy.supabase.co",
  supabaseAnon || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.anon.key",
  {
    auth: {
      lock: dummyLock,
    }
  }
)
