// Single owner of the live access token.
//
// Previous agents kept stacking extra getSession()/refreshSession() calls
// (AuthContext, groq.ts, syncEngine) each with their own timeouts. Supabase
// refresh tokens are single-use, so those overlapping calls stole the token
// from each other, timed out, then sent an empty/expired JWT to the Groq
// worker — which correctly returned 401. That loop comes back about an hour
// after login (token TTL), which is why this "looked fixed" until the next
// session.
//
// Rule: nothing in the app calls supabase.auth.refreshSession() except this
// module. Call ensureFreshAccessToken() instead.

import { type Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

const AUTH_CACHE_KEY = "pz_auth_cache"
const REFRESH_LOCK_KEY = "pz_auth_refresh_lock"
const REFRESH_LOCK_TTL_MS = 10_000
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`

let cachedSession: Session | null = null
let inFlight: Promise<string> | null = null

const listeners = new Set<(session: Session | null) => void>()

export const authChannel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("pz_auth_sync") : null

export function getCachedSession(): Session | null {
  return cachedSession
}

export function getCachedAccessToken(): string | null {
  return cachedSession?.access_token ?? null
}

export function getCachedUserId(): string | null {
  return cachedSession?.user?.id ?? null
}

export function subscribeToSession(fn: (session: Session | null) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function setCachedSession(session: Session | null) {
  cachedSession = session
  persistAccessToken(session)
  listeners.forEach((fn) => fn(session))
}

function persistAccessToken(session: Session | null) {
  if (!session) return
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    parsed.session = session
    parsed.user = session.user
    parsed.cachedAt = Date.now()
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(parsed))
  } catch {}
}

function getJwtExpiry(token: string): number {
  try {
    const seg = token.split(".")[1]
    if (!seg) return 0
    const payload = JSON.parse(atob(seg.replace(/-/g, "+").replace(/_/g, "/")))
    return payload?.exp ?? 0
  } catch {
    return 0
  }
}

export function isAccessTokenFresh(token: string | null | undefined, bufferSec = 90): boolean {
  if (!token) return false
  if (token === "mock-token") return true
  const exp = getJwtExpiry(token)
  if (!exp) return false
  return exp - Math.floor(Date.now() / 1000) > bufferSec
}

function readCachedTokenFromStorage(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const token = parsed?.session?.access_token as string | undefined
    if (token && isAccessTokenFresh(token) && parsed.session) {
      cachedSession = parsed.session
      return token
    }
  } catch {}
  return null
}

export async function ensureFreshAccessToken(options?: { force?: boolean }): Promise<string> {
  // If not forcing, check if we have a fresh token in memory or storage
  if (!options?.force) {
    const mem = cachedSession?.access_token
    if (mem && isAccessTokenFresh(mem)) return mem
    const stored = readCachedTokenFromStorage()
    if (stored) return stored
  }

  // GoTrue's getSession() automatically refreshes the token if it's expired.
  // If force is true (e.g. 401 from API), we explicitly ask GoTrue to refresh.
  // Both calls safely use GoTrue's internal native lock.
  const { data, error } = options?.force 
    ? await supabase.auth.refreshSession() 
    : await supabase.auth.getSession()
  
  if (error || !data.session?.access_token) {
    throw new Error(error?.message || "Your session expired. Please sign in again.")
  }

  const token = data.session.access_token
  setCachedSession(data.session)
  
  // Only broadcast if it actually changed
  const stored = readCachedTokenFromStorage()
  if (token !== stored) {
    authChannel?.postMessage({ type: "session_refreshed", session: data.session, from: TAB_ID })
  }

  return token
}

export { AUTH_CACHE_KEY, TAB_ID }
