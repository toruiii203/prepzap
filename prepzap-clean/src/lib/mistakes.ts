/**
 * PrepZap — Mistake & Weak Spot Store
 * Centralized store for capturing missed questions across Practice, Arena,
 * Flashcards, and manual entries, enabling targeted retesting and mastery tracking.
 */

export interface MistakeItem {
  id: string | number;
  subject: string;
  date: string;
  overdue: boolean;
  title: string;
  desc: string;
  resolved?: boolean;
  masteredAt?: string;
  note?: string;
  tags?: string[];
  errorType?: "Conceptual Gap" | "Calculation Slip" | "Terminology Mix-up" | "Exam Trap" | "General";
  source?: "practice" | "arena" | "flashcards" | "manual";
  quiz?: {
    q: string;
    options: string[];
    correct: number;
    explanation: string;
  };
}

export function getMistakesKey(userId?: string | null): string {
  return userId ? `studenius_mistakes_${userId}` : "studenius_mistakes_anon";
}

export function loadMistakes(userId?: string | null): MistakeItem[] {
  try {
    const key = getMistakesKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("[Mistakes] Failed to load mistakes:", e);
    return [];
  }
}

export function saveMistakes(userId: string | null | undefined, items: MistakeItem[]): void {
  try {
    const key = getMistakesKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new Event("studenius_mistakes_updated"));
  } catch (e) {
    console.error("[Mistakes] Failed to save mistakes:", e);
  }
}

export function recordMistake(params: {
  userId?: string | null;
  subject?: string;
  title: string;
  desc: string;
  errorType?: "Conceptual Gap" | "Calculation Slip" | "Terminology Mix-up" | "Exam Trap" | "General";
  source?: "practice" | "arena" | "flashcards" | "manual";
  note?: string;
  tags?: string[];
  quiz?: {
    q: string;
    options: string[];
    correct: number;
    explanation: string;
  };
}): MistakeItem {
  const current = loadMistakes(params.userId);
  const normalizedTitle = params.title.trim().toLowerCase();

  // Avoid duplicate entries for the exact same question/concept
  const existingIndex = current.findIndex(
    (m) => !m.resolved && m.title.trim().toLowerCase() === normalizedTitle
  );

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (existingIndex >= 0) {
    const updated = {
      ...current[existingIndex],
      date: dateFormatted,
      overdue: true,
      desc: params.desc || current[existingIndex].desc,
      quiz: params.quiz || current[existingIndex].quiz,
      note: params.note || current[existingIndex].note,
    };
    current[existingIndex] = updated;
    saveMistakes(params.userId, current);
    return updated;
  }

  const newItem: MistakeItem = {
    id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    subject: params.subject || "General",
    date: dateFormatted,
    overdue: false,
    title: params.title.trim(),
    desc: params.desc.trim(),
    resolved: false,
    errorType: params.errorType || "Conceptual Gap",
    source: params.source || "practice",
    note: params.note,
    tags: params.tags || [params.subject || "General"],
    quiz: params.quiz,
  };

  const updatedList = [newItem, ...current];
  saveMistakes(params.userId, updatedList);
  return newItem;
}

export function markMistakeMastered(
  userId: string | null | undefined,
  mistakeId: string | number
): MistakeItem[] {
  const current = loadMistakes(userId);
  const updated = current.map((m) =>
    String(m.id) === String(mistakeId)
      ? {
          ...m,
          resolved: true,
          overdue: false,
          masteredAt: new Date().toISOString(),
        }
      : m
  );
  saveMistakes(userId, updated);
  return updated;
}

export function deleteMistake(
  userId: string | null | undefined,
  mistakeId: string | number
): MistakeItem[] {
  const current = loadMistakes(userId);
  const updated = current.filter((m) => String(m.id) !== String(mistakeId));
  saveMistakes(userId, updated);
  return updated;
}

export function getMistakeStats(items: MistakeItem[]) {
  const total = items.length;
  const toReview = items.filter((m) => !m.resolved).length;
  const mastered = items.filter((m) => m.resolved).length;
  const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 100;

  const subjectCounts: Record<string, number> = {};
  const errorTypeCounts: Record<string, number> = {};

  items
    .filter((m) => !m.resolved)
    .forEach((m) => {
      subjectCounts[m.subject] = (subjectCounts[m.subject] || 0) + 1;
      const type = m.errorType || "General";
      errorTypeCounts[type] = (errorTypeCounts[type] || 0) + 1;
    });

  return {
    total,
    toReview,
    mastered,
    masteryRate,
    subjectCounts,
    errorTypeCounts,
  };
}
