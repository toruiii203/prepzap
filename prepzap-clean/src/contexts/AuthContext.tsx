import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { type Session, type User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { withTimeout } from "@/lib/withTimeout"
import {
  AUTH_CACHE_KEY,
  TAB_ID,
  authChannel,
  ensureFreshAccessToken,
  getCachedAccessToken,
  getCachedSession,
  getCachedUserId,
  isAccessTokenFresh,
  setCachedSession,
  subscribeToSession,
} from "@/lib/authSession"

export interface UserProfile {
  id: string
  full_name: string
  email: string
  plan: "free" | "pro"
  credits_remaining: number
  total_xp: number
  streak_days: number
  daily_goal_minutes: number
  questions_answered: number
  accuracy_percent: number
  avatar_config?: any
  avatar_outfit?: any
  onboarding_complete?: boolean
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  needsOnboarding: boolean
  refreshProfile: () => Promise<void>
  loginAsMockUser: () => void
  signOut: () => Promise<void>
  lsKey: (base: string) => string
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  needsOnboarding: false,
  refreshProfile: async () => {},
  signOut: async () => {},
  lsKey: (base) => `pz_anon_${base}`,
})

function defaultProfile(user: User): UserProfile {
  const meta = user.user_metadata ?? {}
  return {
    id: user.id,
    full_name: meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "there",
    email: user.email ?? "",
    plan: "free",
    credits_remaining: 50,
    total_xp: 0,
    streak_days: 0,
    daily_goal_minutes: 60,
    questions_answered: 0,
    accuracy_percent: 0,
    avatar_config: {},
    avatar_outfit: {},
  }
}

// --- Offline auth cache ------------------------------------------------------
// getSession() can throw or time out while offline, since it may try to
// refresh the token over the network. When that happens, we fall back to
// the last known-good session/user/profile instead of leaving state null
// and getting bounced to the login screen. This is a UI convenience only —
// it doesn't grant real access to anything; actual data reads/writes go
// through the offline data layer (Dexie), and the real Supabase session
// still gets re-validated the moment we're back online.

export { getCachedAccessToken, getCachedSession, getCachedUserId }

export function getCachedProfile() {
  try {
    const raw = localStorage.getItem("pz_auth_cache");
    if (raw) {
      const p = JSON.parse(raw);
      if (p.profile) return p.profile;
    }
  } catch {}
  return null;
}

function cacheAuthState(session: Session, user: User, profile: UserProfile) {
  try {
    localStorage.setItem(
      AUTH_CACHE_KEY,
      JSON.stringify({ session, user, profile, cachedAt: Date.now() })
    )
  } catch (err) {
    console.error("Failed to write auth cache:", err)
  }
}

function readAuthCache(): { session: Session; user: User; profile: UserProfile } | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.session || !parsed?.user || !parsed?.profile) return null
    return parsed
  } catch (err) {
    console.error("Failed to read auth cache:", err)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  // Track if we're mid-fetch so ProtectedRoute waits instead of redirecting
  const fetchingRef = useRef(false)

  const lsKey = useCallback(
    (base: string) => `pz_${user?.id ?? "anon"}_${base}`,
    [user?.id]
  )

  // Accepts the session alongside the user so successful fetches can be
  // cached together for the offline fallback above.
  const fetchProfile = useCallback(async (u: User, s: Session): Promise<boolean> => {
    fetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, plan, credits_remaining, total_xp, streak_days, daily_goal_minutes, questions_answered, accuracy_percent, avatar_config, avatar_outfit, onboarding_complete"
        )
        .eq("id", u.id)
        .maybeSingle()

      if (error || !data) {
        // No profile row — brand new OAuth user mid-onboarding.
        const fallback = defaultProfile(u)
        setProfile(fallback)
        setNeedsOnboarding(true)
        cacheAuthState(s, u, fallback)
        return false
      }

      const merged: UserProfile = {
        ...defaultProfile(u),
        ...data,
        full_name:
          data.full_name ||
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split("@")[0] ||
          "there",
      }
      setProfile(merged)

      // Profile row exists = has an account.
      // onboarding_complete === false means they explicitly started but didn't finish.
      // null/undefined/true = let them through. Never loop existing users.
      const needs = data.onboarding_complete === false
      setNeedsOnboarding(needs)
      cacheAuthState(s, u, merged)
      return !needs
    } catch (err) {
      console.error("fetchProfile failed:", err)
      // Fall back to a usable default rather than leaving profile null forever.
      const fallback = defaultProfile(u)
      setProfile(fallback)
      setNeedsOnboarding(false)
      return false
    } finally {
      fetchingRef.current = false
    }
  }, [])

  const loginAsMockUser = () => {
    console.log("DEV MODE: Manual mock user injection");
    const mockUser = {
      id: "mock-user-123",
      email: "mock@example.com",
      user_metadata: { full_name: "Mock User (Offline PRO)" },
      app_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString()
    };
    const mockSession = {
      access_token: "mock-token",
      user: mockUser,
      expires_at: Date.now() + 9999999
    };
    
    setSession(mockSession);
    setCachedSession(mockSession as Session);
    setUser(mockUser);
    setProfile({
      id: "mock-user-123",
      full_name: "Mock User (Offline PRO)",
      email: "mock@example.com",
      plan: "pro",
      credits_remaining: 9999,
      total_xp: 5600,
      streak_days: 12,
      daily_goal_minutes: 60,
      questions_answered: 100,
      accuracy_percent: 85,
      onboarding_complete: true
    });
    setNeedsOnboarding(false);
  }

  const refreshProfile = useCallback(async () => {
    if (user && session) await fetchProfile(user, session)
  }, [user, session, fetchProfile])

  // --- Optimistic hydration from cache -----------------------------------
  // Read pz_auth_cache from localStorage synchronously at mount time so
  // returning users are never stuck on the loading screen or bounced to
  // /login while getSession() is still warming up. The real getSession()
  // still runs afterwards to refresh the token — this just prevents the
  // visible "loading flash" and the ProtectedRoute redirect that happened
  // whenever getSession() was slow (cold PWA resume, flaky network, etc.).
  useEffect(() => {
    const cached = readAuthCache()
    if (cached) {
      setSession(cached.session)
      setCachedSession(cached.session)
      setUser(cached.user)
      setProfile(cached.profile)
      setNeedsOnboarding(false)
      setLoading(false) // Unblock the UI immediately from cached state
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run exactly once on mount, before the async initialize()

  useEffect(() => {
    let cancelled = false
    // Guards against the initial getSession() path and the onAuthStateChange
    // INITIAL_SESSION path both firing and double-fetching the profile.
    let initialResolved = false

    const initialize = async () => {
      try {
        if (import.meta.env.DEV && (import.meta.env.VITE_SUPABASE_URL || "").includes("your-project-id")) {
          console.log("DEV MODE: Missing real keys, injecting mock user");
          const mockUser = {
            id: "mock-user-123",
            email: "mock@example.com",
            user_metadata: { full_name: "Mock User (Offline PRO)" },
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString()
          } as User;
          const mockSession = {
            access_token: "mock-token",
            user: mockUser,
            expires_at: Date.now() + 9999999
          } as Session;
          
          setSession(mockSession);
          setCachedSession(mockSession);
          setUser(mockUser);
          setProfile({
            id: "mock-user-123",
            full_name: "Mock User (Offline PRO)",
            email: "mock@example.com",
            plan: "pro",
            credits_remaining: 9999,
            total_xp: 5600,
            streak_days: 12,

            daily_goal_minutes: 60,
            questions_answered: 100,
            accuracy_percent: 85,
            onboarding_complete: true
          });
          setNeedsOnboarding(false);
          setLoading(false);
          return;
        }

        const {
          data: { session: s },
          error,
        } = await supabase.auth.getSession()
        if (error) throw error
        if (cancelled) return

        setSession(s)
        setCachedSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          await fetchProfile(s.user, s)
        }
      } catch (err) {
        // This is the critical fix: no matter what goes wrong above
        // (rejected promise, timeout, thrown error), we still fall
        // through to `finally` and unstick the loading state instead
        // of leaving the dashboard hanging until a manual refresh.
        console.error("Auth initialization failed:", err)

        // If getSession() itself failed, that's most likely a network
        // problem (flaky connection, or genuinely offline) — not proof
        // the session is actually invalid. Fall back to the last
        // known-good auth state instead of leaving the user logged out.
        //
        // FIX: this used to also require `!navigator.onLine` here.
        // Removed that condition — navigator.onLine is unreliable
        // (Android/Chrome, and PWAs resuming from background after being
        // backgrounded/closed, routinely report `true` with no real
        // connectivity). Requiring it meant this fallback silently never
        // ran on exactly the case it exists for: the browser insisted it
        // was online while getSession() kept failing, so the cache never
        // got read, `session` stayed null, and ProtectedRoute bounced the
        // user through /login -> /onboarding instead of back into the
        // app. This fallback is explicitly a UI convenience only (see
        // comment above readAuthCache) — no real access is granted by
        // trusting it — so it's safe to always attempt it whenever
        // getSession() itself failed, regardless of what navigator.onLine
        // claims.
        if (!cancelled) {
          const cached = readAuthCache()
          if (cached) {
            setSession(cached.session)
            setCachedSession(cached.session)
            setUser(cached.user)
            setProfile(cached.profile)
            setNeedsOnboarding(false) // trust last known state; don't loop into onboarding offline
          }
        }
      } finally {
        initialResolved = true
        if (!cancelled) setLoading(false)
      }
    }

    initialize()

    // Adopt sessions refreshed by other tabs instead of racing to refresh
    // this tab's own copy of the (now single-use) refresh token.
    const handleBroadcast = (event: MessageEvent) => {
      if (cancelled) return
      const msg = event.data
      if (msg?.type !== "session_refreshed" || msg.from === TAB_ID) return
      const incoming: Session = msg.session
      if (!incoming?.access_token || incoming.access_token === getCachedSession()?.access_token) return

      setSession(incoming)
      setCachedSession(incoming)
      setUser(incoming.user ?? null)
    }
    authChannel?.addEventListener("message", handleBroadcast)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      if ((import.meta.env.VITE_SUPABASE_URL || "").includes("your-project-id")) return;
      
      // Skip the redundant initial fire — `initialize()` above already
      // handles first load. Without this, a fresh session on cold load
      // triggers fetchProfile twice concurrently.
      if (event === "INITIAL_SESSION" && !initialResolved) return
      if (cancelled) return

      if (s?.user) {
        // Fix: Only block UI with loading state if the user actually changed
        // (e.g. initial login, switching accounts).
        // If it's just a background token refresh (same user ID), do NOT
        // set loading=true, as that forces ProtectedRoute to unmount the entire
        // app and destroys active quiz timers!
        const currentUser = getCachedSession()?.user;
        const userChanged = !currentUser || currentUser.id !== s.user.id;
        
        if (userChanged) {
          setLoading(true)
        }
        
        setSession(s)
        setCachedSession(s)
        setUser(s.user)
        try {
          await fetchProfile(s.user, s)
        } catch (err) {
          console.error("Profile fetch on auth change failed:", err)
        } finally {
          if (!cancelled && userChanged) setLoading(false)
        }
      } else {
        // Signed out — clear everything atomically. This only fires on a
        // genuine sign-out event from Supabase, not on a failed network
        // refresh, so it's safe to trust as a real logout.
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current)
          refreshTimerRef.current = null
        }
        setSession(null)
        setCachedSession(null)
        setUser(null)
        setProfile(null)
        setNeedsOnboarding(false)
        setLoading(false)
        try {
          localStorage.removeItem(AUTH_CACHE_KEY)
        } catch {}
      }
    })

    return () => {
      cancelled = true
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      authChannel?.removeEventListener("message", handleBroadcast)
      subscription.unsubscribe()
    }
  }, [fetchProfile])


  const addXP = useCallback(async (amount: number) => {
    if (!user) return;
    
    // Optimistic UI update
    setProfile(prev => {
      if (!prev) return prev;
      const newTotal = (prev.total_xp || 0) + amount;
      const updated = { ...prev, total_xp: newTotal };
      try {
        const stored = localStorage.getItem("pz_auth_cache");
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.profile = updated;
          localStorage.setItem("pz_auth_cache", JSON.stringify(parsed));
        }
      } catch {}
      return updated;
    });

    try {
      // Fetch current to avoid race conditions if possible, then upsert
      const { data: existing } = await supabase.from("profiles").select("total_xp").eq("id", user.id).maybeSingle();
      const newXp = (existing?.total_xp || 0) + amount;
      
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        total_xp: newXp
      }, { onConflict: "id" });
      
      if (error) console.error("Failed to add XP to DB:", error.message);
    } catch (e) {
      console.error("XP error:", e);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    await supabase.auth.signOut()
    try {
      localStorage.removeItem(AUTH_CACHE_KEY)
    } catch {}
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, needsOnboarding, refreshProfile, signOut, addXP, lsKey }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
