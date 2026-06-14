import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface ExamRoom {
  id: string;
  code: string;
  room_name: string;
  topic: string;
  difficulty: string;
  question_count: number;
  time_limit: number;
  questions: Question[];
  mode: "live" | "open";
  host_id: string;
}

function todayPH(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
    .toISOString().split("T")[0];
}

function calcScore(correctCount: number, totalSeconds: number, timeLimitSeconds: number): number {
  const base = correctCount * 1000;
  const timeRemaining = Math.max(0, timeLimitSeconds - totalSeconds);
  const speedBonus = Math.round((timeRemaining / timeLimitSeconds) * 500 * correctCount);
  return base + speedBonus;
}

export default function ArenaQuiz() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDaily = code === "daily";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [room, setRoom] = useState<ExamRoom | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    if (isDaily) {
      const today = todayPH();
      const { data } = await supabase.from("daily_quiz").select("*").eq("date", today).single();
      if (!data) { navigate("/arena"); return; }
      // Check already submitted
      if (user) {
        const { data: sub } = await supabase.from("daily_submissions").select("id").eq("quiz_date", today).eq("user_id", user.id).single();
        if (sub) { navigate("/arena"); return; }
      }
      const qs: Question[] = data.questions;
      setQuestions(qs);
      const secs = 15 * 60; // 15 min default for daily
      setTimeLeft(secs); setTotalTime(secs);
    } else {
      const { data } = await supabase.from("exam_rooms").select("*").eq("code", code?.toUpperCase()).single();
      if (!data) { navigate("/arena"); return; }
      setRoom(data);
      const qs: Question[] = data.questions;
      setQuestions(qs);
      const secs = data.time_limit * 60;
      setTimeLeft(secs); setTotalTime(secs);
    }
    startTimeRef.current = Date.now();
    setLoading(false);
  }, [code, isDaily, user, navigate]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  // Timer
  useEffect(() => {
    if (loading || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, questions.length]);

  const handleSubmit = useCallback(async () => {
    if (submitting || !user) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const correctCount = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_answer ? 1 : 0), 0);
    const score = calcScore(correctCount, elapsed, totalTime);

    try {
      if (isDaily) {
        await supabase.from("daily_submissions").insert({
          user_id: user.id, quiz_date: todayPH(),
          answers: answers, score, time_taken: elapsed,
        });
        navigate("/arena/results/daily", { state: { answers, score, elapsed, questions, isDaily: true } });
      } else if (room) {
        await supabase.from("room_submissions").insert({
          room_id: room.id, user_id: user.id,
          answers: answers, score, time_taken: elapsed,
        });
        navigate(`/arena/results/${code}`, { state: { answers, score, elapsed, questions, isDaily: false } });
      }
    } catch (e) {
      console.error("Submit error:", e);
      setSubmitting(false);
    }
  }, [submitting, user, questions, answers, totalTime, isDaily, room, code, navigate]);

  const selectAnswer = (letter: string) => {
    setAnswers((prev) => ({ ...prev, [currentQ]: letter }));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const progressPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const isLow = timeLeft < 60;
  const q = questions[currentQ];
  const optionLetters = ["A", "B", "C", "D"];

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f0e8] flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined animate-spin text-[36px]">progress_activity</span>
        <p className="font-bold text-[14px] text-black/50">Loading quiz...</p>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8] pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#f5f0e8] border-b-[1.5px] border-black shadow-[0_2px_0px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center px-4 py-3">
          <button onClick={() => navigate("/arena")} className="flex items-center gap-1 font-bold text-[13px] text-black/50">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <h1 className="font-black text-[15px] text-black truncate max-w-[180px]">
            {isDaily ? "Daily Challenge" : room?.room_name}
          </h1>
          <div className={`border-2 border-black px-3 py-1 font-mono font-black text-[14px] shadow-[2px_2px_0px_0px_#000] ${isLow ? "bg-[#E8534A] text-white" : "bg-white text-black"}`}>
            {currentQ + 1}/{questions.length}
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-black/10 border-t border-black/10">
          <div
            className={`h-full transition-all duration-1000 ${isLow ? "bg-[#E8534A]" : "bg-[#f0a040]"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <main className="flex flex-col gap-5 px-4 pt-6">
        {/* Timer */}
        <div className="flex flex-col items-center">
          <span className={`font-black text-[48px] leading-none tracking-tight ${isLow ? "text-[#E8534A]" : "text-black"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Question card */}
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-5 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#f5f0e8] border-2 border-black rounded-full" />
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest border-2 border-black px-2 py-0.5 bg-[#f5f0e8] mb-3">
            {isDaily ? "Daily Quiz" : room?.topic} · {isDaily ? "Hard" : room?.difficulty}
          </span>
          <p className="font-black text-[17px] text-black leading-snug">{q.question}</p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {q.options.map((opt, i) => {
            const letter = optionLetters[i];
            const selected = answers[currentQ] === letter;
            return (
              <button
                key={letter}
                onClick={() => selectAnswer(letter)}
                className={`w-full border-2 border-black p-4 flex items-center gap-4 text-left transition-all active:translate-x-[2px] active:translate-y-[2px] ${
                  selected
                    ? "bg-black text-white shadow-[3px_3px_0px_0px_#f0a040]"
                    : "bg-white text-black shadow-[3px_3px_0px_0px_#000] hover:bg-[#f5f0e8]"
                }`}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-[13px] flex-shrink-0 ${selected ? "border-white bg-white text-black" : "border-black"}`}>
                  {letter}
                </div>
                <p className={`font-medium text-[14px] flex-1 leading-snug ${selected ? "font-bold" : ""}`}>{opt}</p>
              </button>
            );
          })}
        </div>

        {/* Dot progress */}
        <div className="flex justify-center gap-1.5 pt-2">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === currentQ
                  ? "w-4 h-3 bg-[#f0a040] border-2 border-black"
                  : answers[i]
                  ? "w-2.5 h-2.5 bg-black border border-black"
                  : "w-2.5 h-2.5 bg-black/20 border border-black/30"
              }`}
            />
          ))}
        </div>
      </main>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-[#f5f0e8] border-t-2 border-black px-4 py-4 z-20">
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
            disabled={currentQ === 0}
            className="flex-1 bg-[#f5f0e8] border-2 border-black font-bold text-[14px] py-3.5 flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>Prev
          </button>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ((q) => Math.min(questions.length - 1, q + 1))}
              className="flex-1 bg-black text-white border-2 border-black font-bold text-[14px] py-3.5 flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              Next<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-[#f0a040] text-black border-2 border-black font-bold text-[14px] py-3.5 flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
            >
              {submitting ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <>Submit<span className="material-symbols-outlined text-[18px]">check</span></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
