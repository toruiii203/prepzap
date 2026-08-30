import { supabase } from "@/lib/supabase";
import { callGroq, safeParseJSON } from "@/lib/groq";

export interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface DailyQuiz {
  id: string;
  challenge_date: string;
  topic: string;
  difficulty: string;
  questions: Question[];
}

export function todayPH(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const ROTATING_TOPICS = [
  { topic: "General Science & Biology", difficulty: "medium" },
  { topic: "World History & Global Civilizations", difficulty: "medium" },
  { topic: "Mathematics & Logic Reasoning", difficulty: "hard" },
  { topic: "Computer Science & Digital Systems", difficulty: "medium" },
  { topic: "Physics & Fundamental Forces", difficulty: "medium" },
  { topic: "Chemistry & Molecular Sciences", difficulty: "medium" },
  { topic: "Economics, Markets & Society", difficulty: "easy" },
  { topic: "Neuroscience & Cognitive Psychology", difficulty: "medium" },
  { topic: "Environmental Science & Climate", difficulty: "easy" },
  { topic: "Literature & Critical Analysis", difficulty: "medium" },
];

export async function generateDailyQuestions(topic: string, count: number = 20, difficulty: string = "medium"): Promise<Question[]> {
  const prompt = `Generate ${count} university-level multiple choice questions for a Daily Academic Challenge about "${topic}" at ${difficulty} difficulty.
Return ONLY a valid JSON array of objects with keys "question", "options" (array of 4 strings with letter prefixes "A. ...", "B. ...", "C. ...", "D. ..."), "correct_answer" ("A", "B", "C", or "D"), and "explanation" (brief 1-2 sentences):
[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correct_answer":"A","explanation":"..."}]`;

  const raw = await callGroq(
    [{ role: "user", content: prompt }],
    undefined,
    "meta-llama/llama-3.1-8b-instruct",
    2500,
    "arena_gen"
  );
  return safeParseJSON<Question[]>(raw);
}

export async function getOrCreateDailyChallenge(): Promise<DailyQuiz | null> {
  const today = todayPH();

  // 1. Try to load from localStorage cache first
  const cacheKey = `pz_daily_challenge_${today}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.questions?.length > 0) return parsed;
    }
  } catch {}

  // 2. Try to fetch from Supabase
  try {
    const { data, error } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("challenge_date", today)
      .maybeSingle();

    if (data && data.questions && data.questions.length > 0) {
      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
      return data as DailyQuiz;
    }
  } catch (err) {
    console.warn("Could not query daily_challenges from Supabase:", err);
  }

  // 3. If no quiz exists for today yet, generate it now!
  const [year, month, day] = today.split("-").map(Number);
  const dayIndex = Math.abs(Math.floor((year * 365 + month * 30 + day)) % ROTATING_TOPICS.length);
  const { topic, difficulty } = ROTATING_TOPICS[dayIndex];

  try {
    const questions = await generateDailyQuestions(topic, 20, difficulty);
    if (questions && questions.length > 0) {
      const newQuiz = {
        challenge_date: today,
        topic,
        difficulty,
        questions,
      };

      // Try inserting into Supabase so all users get the exact same quiz today
      try {
        const { data: inserted } = await supabase
          .from("daily_challenges")
          .insert({
            challenge_date: today,
            topic,
            questions,
          })
          .select()
          .maybeSingle();

        if (inserted) {
          const quizWithDiff: DailyQuiz = {
            ...inserted,
            difficulty,
          };
          try { localStorage.setItem(cacheKey, JSON.stringify(quizWithDiff)); } catch {}
          return quizWithDiff;
        }
      } catch (insertErr) {
        console.warn("Failed to persist daily challenge to Supabase (using local):", insertErr);
      }

      const localQuiz: DailyQuiz = {
        id: "daily-" + today,
        ...newQuiz,
      };
      try { localStorage.setItem(cacheKey, JSON.stringify(localQuiz)); } catch {}
      return localQuiz;
    }
  } catch (genErr) {
    console.error("Failed to generate daily challenge:", genErr);
  }

  return null;
}
