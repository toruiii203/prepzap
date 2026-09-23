import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface StudySession {
  id: string;
  title: string;
  duration_minutes: number;
  created_at: string;
}

export interface StudyStats {
  sessions: number;
  studyHrs: number;
  avgScore: number;
  streak: number;
}

export function useStudyStats() {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [stats, setStats] = useState<StudyStats>({ sessions: 0, studyHrs: 0, avgScore: 0, streak: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Optimistic UI: Hydrate immediately from cache
      const local = localStorage.getItem("pz_study_sessions");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setSessions(parsed);
          calculateStats(parsed);
        } catch (err) {}
      }

      // We use Promise.race to prevent infinite hangs if Supabase's internal queue is stuck
      const fetchPromise = supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 8000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (!error && data) {
        setSessions(data);
        calculateStats(data);
        localStorage.setItem("pz_study_sessions", JSON.stringify(data));
      }
    } catch (err) {
      console.warn("Failed to fetch study stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: StudySession[]) => {
    const totalSess = data.length;
    const totalMins = data.reduce((acc, curr) => acc + (Number(curr.duration_minutes) || 0), 0);
    const hours = Math.round((totalMins / 60) * 10) / 10;
    setStats({
      sessions: totalSess,
      studyHrs: hours,
      avgScore: 0, // Placeholder, normally computed from study_activity if needed
      streak: profile?.streak_days || 0
    });
  };

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh when a new session is logged passively
    const handleUpdate = () => fetchStats();
    window.addEventListener("studenius:session-logged", handleUpdate);
    return () => window.removeEventListener("studenius:session-logged", handleUpdate);
  }, [user?.id, profile?.streak_days]);

  return { sessions, stats, loading, refreshStats: fetchStats };
}
