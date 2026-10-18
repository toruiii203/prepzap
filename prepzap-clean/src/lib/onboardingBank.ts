export interface DiagnosticQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const DIAGNOSTIC_QUESTION_BANK: Record<string, DiagnosticQuestion> = {
  math: {
    question: "What is the slope of the line given by 2y = 4x + 6?",
    options: ["2", "4", "1/2", "6"],
    correctIndex: 0,
    explanation: "Dividing by 2 gives y = 2x + 3, so the slope (m) is 2.",
  },
  science: {
    question: "Which organelle is responsible for generating most of the chemical energy needed by the cell?",
    options: ["Ribosome", "Mitochondria", "Golgi apparatus", "Endoplasmic reticulum"],
    correctIndex: 1,
    explanation: "Mitochondria produce most of the cell's ATP through cellular respiration.",
  },
  english: {
    question: "Which of the following is an example of an oxymoron?",
    options: ["Deafening silence", "Brave lion", "Running river", "Whispering wind"],
    correctIndex: 0,
    explanation: "An oxymoron combines two contradictory terms, like deafening and silence.",
  },
  biology: {
    question: "During cellular respiration, where does the Krebs cycle take place in eukaryotic cells?",
    options: ["Cytoplasm", "Mitochondrial matrix", "Endoplasmic reticulum", "Ribosome"],
    correctIndex: 1,
    explanation: "The Krebs cycle occurs in the mitochondrial matrix, while glycolysis occurs in the cytoplasm.",
  },
  calculus: {
    question: "What is the derivative of f(x) = ln(3x)?",
    options: ["1/x", "3/x", "1/(3x)", "3 ln(x)"],
    correctIndex: 0,
    explanation: "By the chain rule: f'(x) = (1/(3x)) * 3 = 1/x.",
  },
  chemistry: {
    question: "Which type of intermolecular force is the strongest in liquid water?",
    options: ["London dispersion", "Dipole-induced dipole", "Hydrogen bonding", "Ion-dipole"],
    correctIndex: 2,
    explanation: "Hydrogen bonding between hydrogen and oxygen gives water its uniquely high boiling point.",
  },
  history: {
    question: "Which 1215 document is best known for establishing the principle that everyone, even the king, is subject to the law?",
    options: ["Treaty of Versailles", "Magna Carta", "Habeas Corpus Act", "Bill of Rights"],
    correctIndex: 1,
    explanation: "The Magna Carta was granted by King John of England in 1215 at Runnymede.",
  },
  psychology: {
    question: "In classical conditioning, what was the meat powder in Pavlov's experiment?",
    options: ["Conditioned stimulus", "Unconditioned stimulus", "Conditioned response", "Neutral stimulus"],
    correctIndex: 1,
    explanation: "The meat powder naturally triggered salivation without training, making it the unconditioned stimulus.",
  },
  "computer science": {
    question: "What is the average time complexity of searching an element in a balanced binary search tree?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
    correctIndex: 2,
    explanation: "Each comparison halves the search space, giving an O(log n) average lookup time.",
  },
  physics: {
    question: "If the net external force acting on an object is zero, what must be true about its velocity?",
    options: ["It is zero", "It is decreasing", "It is constant", "It is increasing"],
    correctIndex: 2,
    explanation: "By Newton's First Law, an object with zero net force maintains a constant velocity.",
  },
  economics: {
    question: "What economic concept describes the cost of the next best alternative given up?",
    options: ["Sunk cost", "Marginal cost", "Opportunity cost", "Fixed cost"],
    correctIndex: 2,
    explanation: "Opportunity cost represents the potential benefits missed out on when choosing one alternative over another.",
  },
  general: {
    question: "Which study method has the highest scientific evidence for long-term retention?",
    options: ["Re-reading highlighted notes", "Active recall testing", "Cramming the night before", "Passive listening"],
    correctIndex: 1,
    explanation: "Testing yourself beats re-reading notes because actively retrieving information builds stronger memory.",
  },
};

export function getDiagnosticQuestion(subject: string): DiagnosticQuestion {
  const normalized = (subject || "").toLowerCase().trim();
  const raw = DIAGNOSTIC_QUESTION_BANK[normalized] || DIAGNOSTIC_QUESTION_BANK["general"];

  // Shuffle options dynamically using Fisher-Yates and track correct index
  const indices = raw.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffledOptions = indices.map((idx) => raw.options[idx]);
  const newCorrectIndex = indices.indexOf(raw.correctIndex);

  return {
    question: raw.question,
    options: shuffledOptions,
    correctIndex: newCorrectIndex,
    explanation: raw.explanation,
  };
}

export const ONBOARDING_DRAFT_KEY = "studenius_onboarding_draft_v2";

export interface OnboardingDraft {
  version: 2;
  timestamp: number;
  firstWinLocalDate?: string; // YYYY-MM-DD local format
  subject: string;
  customSubject?: string;
  dailyGoalMinutes: number;
  streakTargetDays: number;
  examTitle?: string;
  examDate?: string;
  firstWinCompleted: boolean;
  ageConfirmed: boolean;
  audioMuted: boolean;
}

const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getOnboardingDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed: OnboardingDraft = JSON.parse(raw);
    if (parsed.version !== 2) {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      return null;
    }
    if (Date.now() - (parsed.timestamp || 0) > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    return null;
  }
}

export function saveOnboardingDraft(updates: Partial<OnboardingDraft>): OnboardingDraft {
  const existing = getOnboardingDraft() || {
    version: 2 as const,
    timestamp: Date.now(),
    subject: "Math",
    dailyGoalMinutes: 15,
    streakTargetDays: 7,
    firstWinCompleted: false,
    ageConfirmed: false,
    audioMuted: false,
  };

  const next: OnboardingDraft = {
    ...existing,
    ...updates,
    version: 2,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(next));
  } catch (err) {
    console.error("Failed to persist onboarding draft:", err);
  }

  return next;
}

export function clearOnboardingDraft(): void {
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {}
}
import { supabase } from "@/lib/supabase";
import { saveUserPreferences, type UserStudyPreferences } from "@/lib/userPreferences";
import { type User } from "@supabase/supabase-js";

export async function applyOnboardingDraftIfAny(user: User): Promise<boolean> {
  const draft = getOnboardingDraft();
  if (!draft) return false;

  try {
    const todayLocal = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
    const wonDate = draft.firstWinLocalDate;
    
    // Check if wonDate is today or within the past 24 hours
    let creditStreak = 1;
    if (draft.firstWinCompleted && wonDate) {
      const now = new Date();
      const won = new Date(wonDate);
      const diffHours = (now.getTime() - won.getTime()) / (1000 * 60 * 60);
      if (wonDate === todayLocal || (diffHours >= 0 && diffHours <= 28)) {
        creditStreak = 1;
      }
    }

    const finalSubject = draft.customSubject?.trim() || draft.subject || "Math";
    const prefs: UserStudyPreferences = {
      name: user.user_metadata?.full_name?.split(" ")[0] || "Student",
      subjects: [finalSubject],
      goal: "grades",
      learningStyles: ["mixed"],
      dailyGoalMinutes: draft.dailyGoalMinutes || 15,
      completedAt: new Date().toISOString(),
      examTarget: draft.examDate ? {
        examTitle: draft.examTitle || `${finalSubject} Exam`,
        examDate: draft.examDate,
        subject: finalSubject,
      } : null,
    };

    saveUserPreferences(prefs, user.id);

    // Persist to Supabase profiles
    await supabase.from("profiles").upsert({
      id: user.id,
      onboarding_complete: true,
      streak_days: creditStreak,
      daily_goal_minutes: draft.dailyGoalMinutes || 15,
      avatar_config: {
        study_preferences: prefs,
      },
    }, { onConflict: "id" });

    clearOnboardingDraft();
    return true;
  } catch (err) {
    console.error("Error applying onboarding draft:", err);
    clearOnboardingDraft();
    return false;
  }
}
