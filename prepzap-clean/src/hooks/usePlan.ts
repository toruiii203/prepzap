import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  canUse as _canUse,
  logUsage as _logUsage,
  getRemainingUses as _getRemainingUses,
  FeatureKey,
} from "@/lib/freemium";

export interface PlanState {
  /** 'free' | 'pro' */
  plan: "free" | "pro";
  /** true when plan is 'pro' AND pro_expires_at is in the future */
  isPro: boolean;
  /** Check if the current user can use a feature (async) */
  canUse: (feature: FeatureKey) => Promise<boolean>;
  /** How many free uses remain today (Infinity for Pro) */
  remaining: (feature: FeatureKey) => Promise<number>;
  /** Log a usage event after a successful action */
  logUsage: (feature: FeatureKey) => Promise<void>;
  /** true while the initial plan data is loading */
  loading: boolean;
}

// Previously, ANY failure of the Supabase "profiles" query — including a
// plain offline network error — fell through to setPlan("free") /
// setIsPro(false). That silently downgraded a real Pro user to the free
// tier's limits the moment they lost connection, with no indication why.
// In Source Library specifically, that dropped fileLimit from 10 to 3,
// which is what was blocking uploads for anyone with more than 3 files
// already saved. Caching the last confirmed plan lets genuinely-offline
// users keep their real limits; a real server error while online still
// fails safe to "free" rather than trusting a possibly-stale cache.
const PLAN_CACHE_KEY = "pz_plan_cache";

function cachePlan(plan: "free" | "pro", isPro: boolean) {
  try {
    localStorage.setItem(
      PLAN_CACHE_KEY,
      JSON.stringify({ plan, isPro, cachedAt: Date.now() })
    );
  } catch {
    // localStorage can throw in private-browsing/quota-exceeded edge cases —
    // not caching for a session isn't worth crashing over.
  }
}

function readCachedPlan(): { plan: "free" | "pro"; isPro: boolean } | null {
  try {
    const raw = localStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.isPro !== "boolean") return null;
    return { plan: parsed.plan === "pro" ? "pro" : "free", isPro: parsed.isPro };
  } catch {
    return null;
  }
}

export function usePlan(): PlanState {
  const { user } = useAuth() as { user: { id: string } | null };
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Fetch plan info from profiles ──────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    if (!user?.id) {
      setPlan("free");
      setIsPro(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("plan, pro_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      console.error("[usePlan] fetch error:", error?.message);

      // Fall back to the last known plan only when we're actually offline.
      // A genuine server-side error while online should still fail safe
      // to "free" — we only trust the cache when there was no way to get
      // a fresh answer in the first place.
      if (!navigator.onLine) {
        const cached = readCachedPlan();
        if (cached) {
          console.log("[usePlan] offline — using cached plan:", cached.plan);
          setPlan(cached.plan);
          setIsPro(cached.isPro);
          setLoading(false);
          return;
        }
      }

      setPlan("free");
      setIsPro(false);
    } else {
      const rawPlan: "free" | "pro" = data.plan ?? "free";
      const expiresAt: string | null = data.pro_expires_at ?? null;

      // Pro is only active if the plan is 'pro' AND not yet expired
      const proActive =
        rawPlan === "pro" && (expiresAt === null || new Date(expiresAt) > new Date());

      setPlan(proActive ? "pro" : "free");
      setIsPro(proActive);
      cachePlan(proActive ? "pro" : "free", proActive);
    }
    setLoading(false);
  }, [user?.id]);

  // ── Re-fetch whenever the logged-in user changes ─────────────────────────────
  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // ── Stable callbacks that capture the current plan ────────────────────────
  const effectivePlan = isPro ? "pro" : "free";

  const canUseFn = useCallback(
    async (feature: FeatureKey): Promise<boolean> => {
      if (!user?.id) return false;
      return _canUse(user.id, feature, effectivePlan);
    },
    [user?.id, effectivePlan]
  );

  const remainingFn = useCallback(
    async (feature: FeatureKey): Promise<number> => {
      if (!user?.id) return 0;
      return _getRemainingUses(user.id, feature, effectivePlan);
    },
    [user?.id, effectivePlan]
  );

  const logUsageFn = useCallback(
    async (feature: FeatureKey): Promise<void> => {
      if (!user?.id) return;
      return _logUsage(user.id, feature);
    },
    [user?.id]
  );

  return {
    plan,
    isPro,
    canUse: canUseFn,
    remaining: remainingFn,
    logUsage: logUsageFn,
    loading,
  };
}
