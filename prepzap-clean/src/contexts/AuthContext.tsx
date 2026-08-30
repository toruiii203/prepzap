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

// Wraps a promise so it can never hang forever. If `getSession()` stalls
// (flaky network, cold token refresh on a returning user), this forces
// resolution instead of leaving `loading` stuck true permanently.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

// --- Offline auth cache ------------------------------------------------------
// getSession() can throw or time out while offline, since it may try to
// refresh the token over the network. When that happens, we fall back to
// the last known-good session/user/profile instead of leaving state null
// and getting bounced to the login screen. This is a UI convenience only —
// it doesn't grant real access to anything; actual data reads/writes go
// through the offline data layer (Dexie), and the real Supabase session
// still gets re-validated the moment we're back online.
const AUTH_CACHE_KEY = "pz_auth_cache"

// In-memory mirror of the current session, kept in sync by AuthProvider
// below. Lets plain (non-React) modules like groq.ts and ToolHistory.tsx
// read the access token / user id synchronously, without ever calling
// supabase.auth.getSession() themselves — that call has a confirmed
// deadlock failure mode (Web Locks contention across tabs) which was the
// actual cause of both the AI Tutor 401s and the "stuck thinking" hangs.
// This is always at least as fresh as what those direct calls would have
// returned, since it's updated on every auth state change including
// background token refreshes.
let cachedSession: Session | null = null
export function getCachedSession(): Session | null {
  return cachedSession
}
export function getCachedAccessToken(): string | null {
  return cachedSession?.access_token ?? null
}
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

export function getCachedUserId(): string | null {
  return cachedSession?.user?.id ?? null
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
        // Do NOT set needsOnboarding=true here — that would cause ProtectedRoute
        // to redirect them back to /onboarding while AuthCallback is routing them.
        // AuthCallback and OnboardingFlow handle new-user routing themselves.
        const fallback = defaultProfile(u)
        setProfile(fallback)
        setNeedsOnboarding(false)
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
    cachedSession = mockSession;
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
          cachedSession = mockSession;
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
        } = await withTimeout(supabase.auth.getSession(), 8000, "getSession()")
        if (error) throw error
        if (cancelled) return

        setSession(s)
        cachedSession = s
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
            cachedSession = cached.session
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
        setLoading(true)
        setSession(s)
        cachedSession = s
        setUser(s.user)
        try {
          await fetchProfile(s.user, s)
        } catch (err) {
          console.error("Profile fetch on auth change failed:", err)
        } finally {
          if (!cancelled) setLoading(false)
        }
      } else {
        // Signed out — clear everything atomically. This only fires on a
        // genuine sign-out event from Supabase, not on a failed network
        // refresh, so it's safe to trust as a real logout.
        setSession(null)
        cachedSession = null
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
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    try {
      localStorage.removeItem(AUTH_CACHE_KEY)
    } catch {}
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, needsOnboarding, refreshProfile, signOut, lsKey }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
