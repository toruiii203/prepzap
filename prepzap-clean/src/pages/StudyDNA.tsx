import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { ToolHeader } from "@/components/ToolShell";
import { Dna, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";

const STORAGE_KEY = "pz_study_dna";

interface DNAProfile {
  learningStyle: string;
  strengths: string[];
  weaknesses: string[];
  bestStudyTime: string;
  recommendedTools: string[];
  insight: string;
  generatedAt: string;
}

const QUESTIONS = [
  { id: "q1", text: "When you learn something new, you prefer to:", options: ["Read detailed notes or textbooks", "Watch videos or visual diagrams", "Do practice problems immediately", "Discuss it with someone or teach it"] },
  { id: "q2", text: "You tend to remember things best when:", options: ["You write them down yourself", "You see a clear diagram or chart", "You repeat them out loud or explain them", "You connect them to something you already know"] },
  { id: "q3", text: "When you hit a difficult concept, you usually:", options: ["Re-read it multiple times until it clicks", "Look for a simpler explanation or analogy", "Try practice questions to figure it out", "Ask someone or look for a video"] },
  { id: "q4", text: "Your most productive study sessions happen:", options: ["Early morning (6am–10am)", "Late morning to midday (10am–2pm)", "Afternoon (2pm–6pm)", "Evening or night (6pm+)"] },
  { id: "q5", text: "How long can you typically focus before needing a break?", options: ["Under 20 minutes", "20–40 minutes", "40–60 minutes", "Over 60 minutes"] },
  { id: "q6", text: "Your biggest study challenge is:", options: ["Staying motivated over time", "Understanding difficult concepts", "Remembering what you've studied", "Managing your time and staying organised"] },
  { id: "q7", text: "You feel most confident when:", options: ["You've reviewed your notes thoroughly", "You can visualise how things connect", "You've practised enough questions", "You can explain it to someone else"] },
];

export default function StudyDNA() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<DNAProfile | null>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"quiz" | "profile">(profile ? "profile" : "quiz");

  useEffect(() => { if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }, [profile]);

  const allAnswered = QUESTIONS.every(q => answers[q.id]);

  const handleGenerate = async () => {
    if (!allAnswered) { toast.error("Please answer all questions"); return; }
    setLoading(true);
    try {
      const answerSummary = QUESTIONS.map(q => `${q.text} → ${answers[q.id]}`).join("\n");
      const prompt = `Based on this student's answers, create their Study DNA profile:
${answerSummary}

Return ONLY valid JSON (no markdown):
{
  "learningStyle": "2-3 word label e.g. 'Visual-Analytical Learner'",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["area to improve 1", "area to improve 2"],
  "bestStudyTime": "1 sentence recommendation",
  "recommendedTools": ["tool or technique 1", "tool or technique 2", "tool or technique 3"],
  "insight": "2-3 sentence personalised insight about their learning style and how to optimise it"
}`;
      const raw = await callGroq(prompt, "llama3-8b-8192");
      const parsed: Omit<DNAProfile, "generatedAt"> = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const newProfile: DNAProfile = { ...parsed, generatedAt: new Date().toISOString() };
      setProfile(newProfile);
      setPhase("profile");
    } catch {
      toast.error("Failed to generate profile. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProfile(null);
    setAnswers({});
    localStorage.removeItem(STORAGE_KEY);
    setPhase("quiz");
  };

  const progress = (Object.keys(answers).length / QUESTIONS.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg, #000)", color: "var(--pz-text, #F0E8D4)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <ToolHeader
          icon={<Dna className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />}
          title="Study DNA"
          subtitle="Discover your unique learner profile and study smarter"
        />

        {phase === "quiz" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>{Object.keys(answers).length} of {QUESTIONS.length} answered</p>
              <span className="text-xs" style={{ color: "var(--pz-text-muted)", fontFamily: "'DM Mono',monospace" }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 rounded-none mb-6" style={{ background: "var(--pz-surface3)" }}>
              <div className="h-full rounded-none" style={{ width: `${progress}%`, background: "var(--pz-gold)", transition: "width 0.3s ease" }} />
            </div>

            <div className="space-y-5">
              {QUESTIONS.map((q, i) => (
                <div key={q.id} className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: `1px solid ${answers[q.id] ? "var(--pz-gold)40" : "var(--pz-border)"}`, borderLeft: answers[q.id] ? "3px solid var(--pz-gold)" : "3px solid var(--pz-surface3)" }}>
                  <p className="text-sm font-medium mb-3" style={{ color: "var(--pz-text)" }}>
                    <span style={{ color: "var(--pz-text-muted)", marginRight: 8, fontFamily: "'DM Mono',monospace" }}>{i + 1}.</span>
                    {q.text}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, j) => (
                      <button
                        key={j}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        className="w-full text-left px-3 py-2 rounded-none text-sm transition-colors"
                        style={{
                          background: answers[q.id] === opt ? "var(--pz-gold-dim)" : "var(--pz-surface3)",
                          border: `1px solid ${answers[q.id] === opt ? "var(--pz-gold)" : "var(--pz-border)"}`,
                          color: answers[q.id] === opt ? "var(--pz-gold)" : "var(--pz-text-2)",
                          fontWeight: answers[q.id] === opt ? 600 : 400,
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !allAnswered}
              className="w-full py-3 rounded-none font-semibold text-sm mt-6"
              style={{ background: allAnswered ? "var(--pz-gold)" : "var(--pz-surface3)", color: allAnswered ? "#000" : "var(--pz-text-muted)" }}
            >
              {loading ? "Analysing your DNA..." : "Generate My Study DNA →"}
            </Button>
          </div>
        )}

        {phase === "profile" && profile && (
          <div className="mt-6 space-y-4">
            <div className="p-5 rounded-none text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-gold)40", borderTop: "2px solid var(--pz-gold)" }}>
              <div className="w-14 h-14 rounded-none flex items-center justify-center text-2xl mx-auto mb-3" style={{ background: "var(--pz-gold-dim)", border: "1px solid var(--pz-gold)30" }}>🧬</div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "var(--pz-text)", fontFamily: "'DM Serif Display', serif" }}>{profile.learningStyle}</h2>
              <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>Generated {new Date(profile.generatedAt).toLocaleDateString()}</p>
            </div>

            <div className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
              <p className="text-sm" style={{ color: "var(--pz-text-2)" }}>{profile.insight}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-teal)" }}>
                <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--pz-teal)" }}>Strengths</h3>
                <ul className="space-y-1.5">
                  {profile.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--pz-text-2)" }}>
                      <span style={{ color: "var(--pz-teal)" }}>✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-rose, #E84040)" }}>
                <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--pz-rose, #E84040)" }}>Growth Areas</h3>
                <ul className="space-y-1.5">
                  {profile.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--pz-text-2)" }}>
                      <span style={{ color: "var(--pz-rose, #E84040)" }}>→</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
              <h3 className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--pz-text-muted)" }}>Best Study Time</h3>
              <p className="text-sm" style={{ color: "var(--pz-text-2)" }}>⏰ {profile.bestStudyTime}</p>
            </div>

            <div className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
              <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--pz-text-muted)" }}>Recommended Tools & Techniques</h3>
              <div className="flex flex-wrap gap-2">
                {profile.recommendedTools.map((tool, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-none" style={{ background: "var(--pz-gold-dim)", color: "var(--pz-gold)", border: "1px solid var(--pz-gold)25" }}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <Button onClick={handleReset} className="w-full py-2.5 rounded-none text-sm" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
              <RefreshCw className="h-3.5 w-3.5 inline mr-2" /> Retake Quiz
            </Button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
