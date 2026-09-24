import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { StatsCardExport } from "@/components/StatsCardExport";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyStats } from "@/hooks/useStudyStats";

interface AnalyticsProps {
}

export default function Analytics() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const { sessions, loading } = useStudyStats();
  const [tasksCompletedPct, setTasksCompletedPct] = useState(0);
  
  const [subjectAccuracy, setSubjectAccuracy] = useState<{subject: string, correct: number, total: number, pct: number}[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    useEffect(() => {
    // Derive task completion rate from localStorage (same source as Dashboard)
    try {
      const stored = localStorage.getItem("pz_checklist");
      const tasks = stored ? JSON.parse(stored) : [];
      if (tasks.length > 0) {
        const completedCount = tasks.filter((t: any) => t.completed).length;
        setTasksCompletedPct(Math.round((completedCount / tasks.length) * 100));
      }
    } catch {}

    // Mock subject accuracy for now
    setSubjectAccuracy([
      { subject: "Biology", correct: 45, total: 50, pct: 90 },
      { subject: "History", correct: 30, total: 40, pct: 75 },
      { subject: "Math", correct: 15, total: 25, pct: 60 }
    ]);
  }, [user?.id]);-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { StatsCardExport } from "@/components/StatsCardExport";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyStats } from "@/hooks/useStudyStats";

interface AnalyticsProps {
}

