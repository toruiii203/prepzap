import { supabase } from "@/lib/supabase";

export interface ExamTarget {
  examTitle: string;
  examDate: string; // YYYY-MM-DD
  subject?: string;
}

export interface UserStudyPreferences {
  name: string;
  subjects: string[];
  goal: string;
  learningStyles: string[];
  dailyGoalMinutes: number;
  completedAt: string;
  examTarget?: ExamTarget | null;
}

export const SUBJECT_METADATA: Record<string, { name: string; icon: string; color: string; bg: string; recommendedTool: string }> = {
  math: { name: "Mathematics", icon: "calculate", color: "text-[#10B981]", bg: "bg-[#10B981]/15", recommendedTool: "/math" },
  science: { name: "Science", icon: "science", color: "text-[#0EA5E9]", bg: "bg-[#0EA5E9]/15", recommendedTool: "/flashcards" },
  english: { name: "English", icon: "menu_book", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/15", recommendedTool: "/notes" },
  history: { name: "History", icon: "account_balance", color: "text-[#EC4899]", bg: "bg-[#EC4899]/15", recommendedTool: "/flashcards" },
  programming: { name: "Programming", icon: "code", color: "text-[#6366F1]", bg: "bg-[#6366F1]/15", recommendedTool: "/practice" },
  arts: { name: "Arts", icon: "palette", color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/15", recommendedTool: "/visual-learner" },
  other: { name: "General Studies", icon: "apps", color: "text-[#FF4D2E]", bg: "bg-[#FF4D2E]/15", recommendedTool: "/ai-tutor" },
};

export const GOAL_METADATA: Record<string, { label: string; dailyMinutes: number; rexQuote: string; badge: string }> = {
  grades: {
    label: "Boost Grades",
    dailyMinutes: 45,
    rexQuote: "GPA mission locked in! Let's conquer your highest-yield topics today.",
    badge: "Honor Roll Track",
  },
  faster: {
    label: "Study Faster",
    dailyMinutes: 20,
    rexQuote: "High-yield speed mode active: 20-minute power sessions for 2x retention.",
    badge: "Sprint Master",
  },
  habits: {
    label: "Build Habits",
    dailyMinutes: 15,
    rexQuote: "Consistency beats intensity every single time. 15 minutes today keeps the streak alive!",
    badge: "Habit Builder",
  },
  college: {
    label: "Prepare for College",
    dailyMinutes: 40,
    rexQuote: "College-bound mind in action. Deep conceptual mastery starts right here.",
    badge: "Future Scholar",
  },
  skill: {
    label: "Learn New Skills",
    dailyMinutes: 30,
    rexQuote: "Curiosity is your superpower. Let's expand your intellectual toolkit today.",
    badge: "Skill Explorer",
  },
};

export const STYLE_METADATA: Record<string, { label: string; icon: string; topTools: string[]; description: string }> = {
  visual: {
    label: "Visual Learner",
    icon: "visibility",
    topTools: ["/visual-learner", "/flashcards", "/notes", "/ai-tutor"],
    description: "You retain concepts best through diagrams, visual cards, and mental maps.",
  },
  tests: {
    label: "Practice Tester",
    icon: "content_paste",
    topTools: ["/practice", "/arena", "/quick-study", "/ai-tutor"],
    description: "Active exam recall and mock tests yield your highest performance.",
  },
  flashcards: {
    label: "Spaced Recall Pro",
    icon: "dynamic_feed",
    topTools: ["/flashcards", "/quick-study", "/arcade", "/practice"],
    description: "Flipping flashcards and spaced repetition build unbreakable memory.",
  },
  reading: {
    label: "Deep Reader",
    icon: "menu_book",
    topTools: ["/notes", "/sources", "/quick-study", "/teach-it"],
    description: "Structured notes and comprehensive syntheses are your study sanctuary.",
  },
  listening: {
    label: "Auditory & Talker",
    icon: "headphones",
    topTools: ["/ai-tutor", "/teach-it", "/timer", "/practice"],
    description: "Talking concepts out loud with Rex and listening solidify your understanding.",
  },
  mixed: {
    label: "Omni-Learner",
    icon: "shuffle",
    topTools: ["/ai-tutor", "/practice", "/flashcards", "/quick-study"],
    description: "A dynamic cocktail of practice quizzes, flashcards, and interactive tutoring.",
  },
};

const PREF_KEY = "studenius_user_preferences";

export function getStoredPreferences(userId?: string): UserStudyPreferences | null {
  try {
    const key = userId ? `${PREF_KEY}_${userId}` : PREF_KEY;
    const raw = localStorage.getItem(key) || localStorage.getItem(PREF_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading stored preferences:", err);
    return null;
  }
}

export function saveUserPreferences(prefs: UserStudyPreferences, userId?: string): void {
  try {
    const key = userId ? `${PREF_KEY}_${userId}` : PREF_KEY;
    localStorage.setItem(key, JSON.stringify(prefs));
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); // fallback

    // Also dispatch a custom event so open views react immediately
    window.dispatchEvent(new CustomEvent("studenius:preferences-updated", { detail: prefs }));

    // Persist to Supabase in background
    if (userId) {
      supabase
        .from("profiles")
        .update({
          avatar_config: {
            study_preferences: prefs,
          },
          daily_goal_minutes: prefs.dailyGoalMinutes,
        })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) console.warn("Could not sync preferences to Supabase:", error);
        });
    }
  } catch (err) {
    console.error("Error saving user preferences:", err);
  }
}

export function saveExamTarget(examTarget: ExamTarget | null, userId?: string): void {
  const current = getStoredPreferences(userId) || {
    name: "Student",
    subjects: ["other"],
    goal: "grades",
    learningStyles: ["mixed"],
    dailyGoalMinutes: 30,
    completedAt: new Date().toISOString(),
  };
  saveUserPreferences({ ...current, examTarget }, userId);
}

/**
 * Generate context-aware starter quests based on onboarding choices
 */
export function generateSmartQuests(prefs: UserStudyPreferences): Array<{ id: string; title: string; completed: boolean; time: string; route?: string }> {
  const quests: Array<{ id: string; title: string; completed: boolean; time: string; route?: string }> = [];

  // Subject quest
  if (prefs.subjects && prefs.subjects.length > 0) {
    const primarySubId = prefs.subjects[0];
    const subMeta = SUBJECT_METADATA[primarySubId] || SUBJECT_METADATA.other;
    quests.push({
      id: "quest_subject_1",
      title: `Start 10-card recall in ${subMeta.name}`,
      completed: false,
      time: "10m",
      route: subMeta.recommendedTool,
    });
  } else {
    quests.push({
      id: "quest_default_1",
      title: "Review 10 flashcards in your deck",
      completed: false,
      time: "10m",
      route: "/flashcards",
    });
  }

  // Style quest
  const primaryStyle = prefs.learningStyles?.[0];
  if (primaryStyle === "visual") {
    quests.push({
      id: "quest_style_visual",
      title: "Generate a concept map in Visual Learner",
      completed: false,
      time: "15m",
      route: "/visual-learner",
    });
  } else if (primaryStyle === "tests") {
    quests.push({
      id: "quest_style_tests",
      title: "Take a 5-question mock practice quiz",
      completed: false,
      time: "12m",
      route: "/practice",
    });
  } else if (primaryStyle === "listening") {
    quests.push({
      id: "quest_style_listen",
      title: "Ask Rex Tutor to explain a tricky concept",
      completed: false,
      time: "8m",
      route: "/ai-tutor",
    });
  } else {
    quests.push({
      id: "quest_style_cram",
      title: "Create a 5-minute Cram Sheet",
      completed: false,
      time: "10m",
      route: "/quick-study",
    });
  }

  // Universal goal quest
  quests.push({
    id: "quest_daily_streak",
    title: "Complete today's Daily Academic Challenge",
    completed: false,
    time: "5m",
    route: "/arena",
  });

  return quests;
}
