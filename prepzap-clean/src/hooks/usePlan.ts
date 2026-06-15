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
      .single();

    if (error || !data) {
      console.error("[usePlan] fetch error:", error?.message);
      setPlan("free");
      setIsPro(false);
    } else {
      const rawPlan: "free" | "pro" = data.plan ?? "free";
      const expiresAt: string | null = data.pro_expires_at ?? null;

      // Pro is only active if the plan is 'pro' AND not yet expired
      const proActive =
        rawPlan === "pro" &&
        (expiresAt === null || new Date(expiresAt) > new Date());

      setPlan(proActive ? "pro" : "free");
      setIsPro(proActive);
    }

    setLoading(false);
  }, [user?.id]);

  // ── Re-fetch whenever the logged-in user changes ───────────────────────────
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
    canUse:   canUseFn,
    remaining: remainingFn,
    logUsage: logUsageFn,
    loading,
  };
}
