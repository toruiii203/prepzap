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
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, plan, credits_remaining, total_xp, streak_days, daily_goal_minutes, questions_answered, accuracy_percent, avatar_config, avatar_outfit, onboarding_complete"
      )
      .eq("id", u.id)
      .single()

    fetchingRef.current = false

    if (error || !data) {
      // No profile row — brand new user
      setProfile(defaultProfile(u))
      setNeedsOnboarding(true)
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
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user)
  }, [user, fetchProfile])

  useEffect(() => {
    // Initial load
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s)
        setUser(s?.user ?? null)

        if (s?.user) {
          // Show loading while we fetch so ProtectedRoute doesn't jump
          if (event === "SIGNED_IN") setLoading(true)
          await fetchProfile(s.user)
          if (event === "SIGNED_IN") setLoading(false)
        } else {
          setProfile(null)
          setNeedsOnboarding(false)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
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
