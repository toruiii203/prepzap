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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]               = useState<Session | null>(null)
  const [user, setUser]                     = useState<User | null>(null)
  const [profile, setProfile]               = useState<UserProfile | null>(null)
  const [loading, setLoading]               = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  // Track if we're mid-fetch so ProtectedRoute waits instead of redirecting
  const fetchingRef = useRef(false)

  const lsKey = useCallback(
    (base: string) => `pz_${user?.id ?? "anon"}_${base}`,
    [user?.id]
  )

  const fetchProfile = useCallback(async (u: User): Promise<boolean> => {
    fetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, plan, credits_remaining, total_xp, streak_days, daily_goal_minutes, questions_answered, accuracy_percent, avatar_config, avatar_outfit, onboarding_complete"
        )
        .eq("id", u.id)
        .single()

      if (error || !data) {
        // No profile row — brand new OAuth user mid-onboarding.
        // Do NOT set needsOnboarding=true here — that would cause ProtectedRoute
        // to redirect them back to /onboarding while AuthCallback is routing them.
        // AuthCallback and OnboardingFlow handle new-user routing themselves.
        setProfile(defaultProfile(u))
        setNeedsOnboarding(false)
        return false
      }

      setProfile({
        ...defaultProfile(u),
        ...data,
        full_name:
          data.full_name ||
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split("@")[0] ||
          "there",
      })

      // Profile row exists = has an account.
      // onboarding_complete === false means they explicitly started but didn't finish.
      // null/undefined/true = let them through. Never loop existing users.
      const needs = data.onboarding_complete === false
      setNeedsOnboarding(needs)
      return !needs
    } catch (err) {
      console.error("fetchProfile failed:", err)
      // Fall back to a usable default rather than leaving profile null forever.
      setProfile(defaultProfile(u))
      setNeedsOnboarding(false)
      return false
    } finally {
      fetchingRef.current = false
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user)
  }, [user, fetchProfile])

  useEffect(() => {
    let cancelled = false
    // Guards against the initial getSession() path and the onAuthStateChange
    // INITIAL_SESSION path both firing and double-fetching the profile.
    let initialResolved = false

    const initialize = async () => {
      try {
        const {
          data: { session: s },
          error,
        } = await withTimeout(supabase.auth.getSession(), 8000, "getSession()")

        if (error) throw error
        if (cancelled) return

        setSession(s)
        setUser(s?.user ?? null)

        if (s?.user) {
          await fetchProfile(s.user)
        }
      } catch (err) {
        // This is the critical fix: no matter what goes wrong above
        // (rejected promise, timeout, thrown error), we still fall
        // through to `finally` and unstick the loading state instead
        // of leaving the dashboard hanging until a manual refresh.
        console.error("Auth initialization failed:", err)
      } finally {
        initialResolved = true
        if (!cancelled) setLoading(false)
      }
    }

    initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      // Skip the redundant initial fire — `initialize()` above already
      // handles first load. Without this, a fresh session on cold load
      // triggers fetchProfile twice concurrently.
      if (event === "INITIAL_SESSION" && !initialResolved) return
      if (cancelled) return

      if (s?.user) {
        setLoading(true)
        setSession(s)
        setUser(s.user)
        try {
          await fetchProfile(s.user)
        } catch (err) {
          console.error("Profile fetch on auth change failed:", err)
        } finally {
          if (!cancelled) setLoading(false)
        }
      } else {
        // Signed out — clear everything atomically
        setSession(null)
        setUser(null)
        setProfile(null)
        setNeedsOnboarding(false)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
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
