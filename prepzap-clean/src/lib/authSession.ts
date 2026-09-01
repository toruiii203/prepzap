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

function tryClaimRefreshLock(): boolean {
  try {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY)
    if (raw) {
      const { ts } = JSON.parse(raw)
      if (Date.now() - ts < REFRESH_LOCK_TTL_MS) return false
    }
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ tabId: TAB_ID, ts: Date.now() }))
    return true
  } catch {
    return true
  }
}

function releaseRefreshLock() {
  try {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY)
    if (raw) {
      const { tabId } = JSON.parse(raw)
      if (tabId === TAB_ID) localStorage.removeItem(REFRESH_LOCK_KEY)
    }
  } catch {}
}

async function waitForForeignRefresh(ms = 3500): Promise<string | null> {
  const started = Date.now()
  while (Date.now() - started < ms) {
    await new Promise((r) => setTimeout(r, 250))
    const mem = cachedSession?.access_token
    if (mem && isAccessTokenFresh(mem)) return mem
    const stored = readCachedTokenFromStorage()
    if (stored) return stored
  }
  return null
}

async function refreshNow(): Promise<string> {
  if (!tryClaimRefreshLock()) {
    const fromOtherTab = await waitForForeignRefresh()
    if (fromOtherTab) return fromOtherTab
  }

  // Prevent invalid_grant logouts: if the token was JUST refreshed (e.g. in the last 100s
  // by another tab or an internal supabase-js timer), do NOT force another network refresh.
  // A fresh Supabase token lasts 3600s. If it expires in > 3500s, it's brand new.
  const mem = cachedSession?.access_token;
  if (mem && isAccessTokenFresh(mem, 3500)) return mem;
  const stored = readCachedTokenFromStorage();
  if (stored && isAccessTokenFresh(stored, 3500)) return stored;

  try {
    const { data, error } = await supabase.auth.refreshSession()
    const session = data?.session
    if (!error && session?.access_token) {
      setCachedSession(session)
      authChannel?.postMessage({ type: "session_refreshed", session, from: TAB_ID })
      return session.access_token
    }

    // Do NOT call supabase.auth.getSession() here — it acquires the same
    // serialAuthLock we're holding, causing a self-deadlock.
    // If refreshSession() failed, the session is genuinely expired.
    throw new Error(
      error?.message || "Your session expired. Please sign in again."
    )
  } finally {
    releaseRefreshLock()
  }
}

export async function ensureFreshAccessToken(options?: { force?: boolean }): Promise<string> {
  if (!options?.force) {
    const mem = cachedSession?.access_token
    if (mem && isAccessTokenFresh(mem)) return mem
    const stored = readCachedTokenFromStorage()
    if (stored) return stored
  }

  if (inFlight) return inFlight

  inFlight = refreshNow().finally(() => {
    inFlight = null
  })

  return inFlight
}

export { AUTH_CACHE_KEY, TAB_ID }
