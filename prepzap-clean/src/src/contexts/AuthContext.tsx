/**
 * PrepZap — AuthContext
 * Single source of truth for the Supabase session, user identity, and
 * live profile data (plan, credits, xp, streak).
 *
 * Usage:
 *   const { user, profile, loading, refreshProfile, signOut } = useAuth()
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { type Session, type User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
  /** Per-user localStorage key prefix — use this instead of raw keys */
  lsKey: (base: string) => string
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
  lsKey: (base) => `pz_anon_${base}`,
})

// ─── Default profile shape ────────────────────────────────────────────────────

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
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const lsKey = useCallback(
    (base: string) => `pz_${user?.id ?? "anon"}_${base}`,
    [user?.id]
  )

  const fetchProfile = useCallback(async (u: User) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, plan, credits_remaining, total_xp, streak_days, daily_goal_minutes, questions_answered, accuracy_percent"
      )
      .eq("id", u.id)
      .single()

    if (error || !data) {
      // Profile row doesn't exist yet — use defaults derived from auth metadata
      setProfile(defaultProfile(u))
    } else {
      setProfile({
        ...defaultProfile(u),          // fill any missing columns with defaults
        ...data,
        full_name:
          data.full_name ||
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split("@")[0] ||
          "there",
      })
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user)
  }, [user, fetchProfile])

  useEffect(() => {
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
      (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          fetchProfile(s.user)
        } else {
          setProfile(null)
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
      value={{ session, user, profile, loading, refreshProfile, signOut, lsKey }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext)
}
