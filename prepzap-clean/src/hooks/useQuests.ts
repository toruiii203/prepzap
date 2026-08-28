import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useQuests() {
  const { user } = useAuth();
  const [completedQuestIds, setCompletedQuestIds] = useState<Set<string>>(new Set());
  const [weeklyActivity, setWeeklyActivity] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function loadData() {
      // Load today's progress
      const { data: progress } = await supabase.rpc('get_todays_quest_progress', { p_user_id: user.id });
      if (progress) {
        setCompletedQuestIds(new Set(progress.map((p: any) => p.quest_id)));
      }

      // Load weekly streak activity
      const { data: weekly } = await supabase.rpc('get_weekly_quest_activity', { p_user_id: user.id });
      if (weekly) {
        const activityMap: Record<string, number> = {};
        weekly.forEach((w: any) => {
          activityMap[w.activity_date] = w.completed_count; // e.g. "2026-08-28": 2
        });
        setWeeklyActivity(activityMap);
      }
      setLoading(false);
    }
    
    loadData();
  }, [user]);

  const completeQuest = async (questId: string) => {
    if (!user) return;
    
    // Optimistic update
    setCompletedQuestIds((prev) => {
      const next = new Set(prev);
      next.add(questId);
      return next;
    });

    const { error } = await supabase
      .from('daily_quest_completions')
      .insert({ user_id: user.id, quest_id: questId });
      
    if (error) {
      console.warn("Failed to complete quest (might already be completed today):", error);
    }
  };

  return { completedQuestIds, weeklyActivity, completeQuest, loading };
}
