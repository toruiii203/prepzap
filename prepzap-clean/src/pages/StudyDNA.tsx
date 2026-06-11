import { ToolPageShell } from "@/components/ToolPageShell";
import { useState, useEffect } from "react";


import { ToolHeader } from "@/components/ToolShell";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { Dna, RefreshCw, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext } from "@/lib/sourceContext";

const PROFILE_KEY = "pz_study_dna_profile";
const USAGE_KEY   = "pz_study_dna_usage";

interface DNAProfile {
  learningStyle: string;
  strengths: string[];
  weaknesses: string[];
  bestStudyTime: string;
  recommendedTools: string[];
  insight: string;
  generatedAt: string;
}

interface UsageData {
  [tool: string]: number;
}

const QUESTIONS = [
  { id: "q1", text: "When you learn something new, you prefer to:", options: ["Read detailed notes or textbooks", "Watch videos or visual diagrams", "Do practice problems immediately", "Discuss it or teach it to someone"] },
  { id: "q2", text: "You remember things best when:", options: ["You write them down yourself", "You see a clear diagram or chart", "You repeat or explain them out loud", "You connect them to something you know"] },
  { id: "q3", text: "When you hit a difficult concept, you:", options: ["Re-read it until it clicks", "Look for a simpler analogy", "Try practice questions to figure it out", "Ask someone or find a video"] },
  { id: "q4", text: "Your most productive study sessions happen:", options: ["Early morning (6///10am)", "Late morning (10am///2pm)", "Afternoon (2///6pm)", "Evening or night (6pm+)"] },
  { id: "q5", text: "How long can you focus before needing a break?", options: ["Under 20 minutes", "20///40 minutes", "40///60 minutes", "Over 60 minutes"] },
  { id: "q6", text: "Your biggest study challenge is:", options: ["Staying motivated over time", "Understanding difficult concepts", "Remembering what you've studied", "Managing time and staying organised"] },
  { id: "q7", text: "You feel most confident when:", options: ["You've reviewed your notes thoroughly", "You can visualise how things connect", "You've practised enough questions", "You can explain it to someone else"] },
];

function loadUsage(): UsageData {
  try { return JSON.parse(localStorage.getItem(USAGE_KEY) || "{}"); } catch { return {}; }
}

// Call this from any page to track tool visits
export function trackToolVisit(toolName: string) {
  try {
    const usage = loadUsage();
    usage[toolName] = (usage[toolName] || 0) + 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {}
}

export default function StudyDNA() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<DNAProfile | null>(() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"quiz" | "profile">(
    () => { try { return localStorage.getItem(PROFILE_KEY) ? "profile" : "quiz"; } catch { return "quiz"; } }
  );
  const [usage, setUsage] = useState<UsageData>(loadUsage);

  // Track this page visit
  useEffect(() => { trackToolVisit("Study DNA"); setUsage(loadUsage()); }, []);

  const allAnswered = QUESTIONS.every(q => answers[q.id]);
  const ctx = buildAIContext();

  const handleGenerate = async () => {
    if (!allAnswered) { toast.error("Please answer all questions"); return; }
    setLoading(true);
    try {
      const answerSummary = QUESTIONS.map(q => `${q.text} /// ${answers[q.id]}`).join("\n");
      const topTools = Object.entries(usage).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t).join(", ");
      const prompt = `Create a Study DNA profile for a student based on their quiz answers and app usage.

Quiz answers:
${answerSummary}

Most used tools: ${topTools || "none yet"}
${ctx ? `\nCurrent study material:\n${ctx}\n` : ""}

Return ONLY valid JSON, no markdown:
{
  "learningStyle": "2-3 word label e.g. 'Visual-Analytical Learner'",
  "strengths": ["strength 1","strength 2","strength 3"],
  "weaknesses": ["growth area 1","growth area 2"],
  "bestStudyTime": "1 sentence recommendation",
  "recommendedTools": ["tool 1","tool 2","tool 3"],
  "insight": "2-3 sentence personalised insight that references their quiz answers and tool usage patterns"
}`;
      const raw = await callGroq(prompt, "meta-llama/llama-3.3-70b-instruct:free");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const newProfile: DNAProfile = { ...parsed, generatedAt: new Date().toISOString() };
      setProfile(newProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      setPhase("profile");
    } catch { toast.error("Failed to generate profile. Try again."); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setProfile(null);
    setAnswers({});
    localStorage.removeItem(PROFILE_KEY);
    setPhase("quiz");
  };

  const progress = (Object.keys(answers).length / QUESTIONS.length) * 100;

  // Usage bar chart data
  const usageEntries = Object.entries(usage).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxUsage = usageEntries.length > 0 ? Math.max(...usageEntries.map(([, v]) => v)) : 1;

  // Days since profile generated
  const profileAge = profile
    ? Math.floor((Date.now() - new Date(profile.generatedAt).getTime()) / 86400000)
    : 0;

  return (
    <ToolPageShell>
      <main className="max-w-xl mx-auto px-4 pt-6 pb-24">
        <GlobalContextBar compact />
        <ToolHeader
          icon={<Dna className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />}
          title="Study DNA"
          subtitle="Your living learner profile /// updates as you use the app"
        />

        {/* QUIZ */}
        {phase === "quiz" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>{Object.keys(answers).length} of {QUESTIONS.length} answered</p>
              <span className="text-xs" style={{ color: "var(--pz-text-muted)", fontFamily: "monospace" }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 mb-6" style={{ background: "var(--pz-surface3)" }}>
              <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: "var(--pz-gold)" }} />
            </div>

            <div className="space-y-5">
              {QUESTIONS.map((q, i) => (
                <div key={q.id} className="p-4"
                  style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderLeft: answers[q.id] ? "3px solid var(--pz-gold)" : "3px solid var(--pz-surface3)" }}>
                  <p className="text-sm font-medium mb-3" style={{ color: "var(--pz-text)" }}>
                    <span style={{ color: "var(--pz-text-muted)", marginRight: 8, fontFamily: "monospace" }}>{i + 1}.</span>
                    {q.text}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, j) => (
                      <button key={j} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        className="w-full text-left px-3 py-2 text-sm"
                        style={{
                          background: answers[q.id] === opt ? "var(--pz-gold-dim)" : "var(--pz-surface3)",
                          border: `1px solid ${answers[q.id] === opt ? "var(--pz-gold)" : "var(--pz-border)"}`,
                          color: answers[q.id] === opt ? "var(--pz-gold)" : "var(--pz-text-2)",
                          fontWeight: answers[q.id] === opt ? 600 : 400,
                        }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleGenerate} disabled={loading || !allAnswered}
              className="w-full py-3 font-semibold text-sm mt-6"
              style={{ background: allAnswered ? "var(--pz-gold)" : "var(--pz-surface3)", color: allAnswered ? "#000" : "var(--pz-text-muted)" }}>
              {loading ? "Analysing your DNA..." : "Generate My Study DNA ///"}
            </Button>
          </div>
        )}

        {/* PROFILE */}
        {phase === "profile" && profile && (
          <div className="mt-6 space-y-4">
            {/* Header */}
            <div className="p-5 text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-gold)40", borderTop: "2px solid var(--pz-gold)" }}>
              <div className="w-14 h-14 flex items-center justify-center text-2xl mx-auto mb-3"
                style={{ background: "var(--pz-gold-dim)", border: "1px solid var(--pz-gold)30" }}>////</div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "var(--pz-text)" }}>{profile.learningStyle}</h2>
              <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>
                Generated {profileAge === 0 ? "today" : `${profileAge}d ago`}
                {profileAge >= 7 && " Â/ Consider retaking"}
              </p>
              {profileAge >= 7 && (
                <p className="text-xs mt-1 px-3 py-1 inline-block" style={{ background: "var(--pz-gold-dim)", color: "var(--pz-gold)", border: "1px solid var(--pz-gold)30" }}>
                  /// Profile is over a week old /// retake for fresh insights
                </p>
              )}
            </div>

            {/* Insight */}
            <div className="p-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
              <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Your Profile</p>
              <p className="text-sm" style={{ color: "var(--pz-text-2)", lineHeight: 1.7 }}>{profile.insight}</p>
            </div>

            {/* Strengths + Growth */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-teal)" }}>
                <h3 className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "var(--pz-teal)" }}>Strengths</h3>
                <ul className="space-y-1.5">
                  {profile.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--pz-text-2)" }}>
                      <span style={{ color: "var(--pz-teal)" }}>///</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-rose)" }}>
                <h3 className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "var(--pz-rose)" }}>Growth Areas</h3>
                <ul className="space-y-1.5">
                  {profile.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--pz-text-2)" }}>
                      <span style={{ color: "var(--pz-rose)" }}>///</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Best study time */}
            <div className="p-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
              <p className="text-xs font-semibold mb-1 uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Best Study Time</p>
              <p className="text-sm" style={{ color: "var(--pz-text-2)" }}>/// {profile.bestStudyTime}</p>
            </div>

            {/* Recommended tools */}
            <div className="p-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
              <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Recommended Tools</p>
              <div className="flex flex-wrap gap-2">
                {profile.recommendedTools.map((tool, i) => (
                  <span key={i} className="text-xs px-2.5 py-1"
                    style={{ background: "var(--pz-gold-dim)", color: "var(--pz-gold)", border: "1px solid var(--pz-gold)25" }}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* Usage bar chart */}
            {usageEntries.length > 0 && (
              <div className="p-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Your Tool Usage</p>
                </div>
                <div className="space-y-2">
                  {usageEntries.map(([tool, count]) => (
                    <div key={tool} className="flex items-center gap-3">
                      <span className="text-xs w-28 shrink-0 truncate" style={{ color: "var(--pz-text-2)" }}>{tool}</span>
                      <div className="flex-1 h-2" style={{ background: "var(--pz-surface3)" }}>
                        <div className="h-full transition-all duration-700"
                          style={{ width: `${(count / maxUsage) * 100}%`, background: "var(--pz-gold)" }} />
                      </div>
                      <span className="text-xs w-6 text-right shrink-0" style={{ color: "var(--pz-text-muted)", fontFamily: "monospace" }}>{count}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] mt-3" style={{ color: "var(--pz-text-muted)" }}>Updates automatically as you use the app</p>
              </div>
            )}

            {usageEntries.length === 0 && (
              <div className="p-4 text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>Use more tools and your usage patterns will appear here automatically.</p>
              </div>
            )}

            <Button onClick={handleReset} className="w-full py-2.5 text-sm flex items-center justify-center gap-2"
              style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
              <RefreshCw className="h-3.5 w-3.5" /> Retake Quiz
            </Button>
          </div>
        )}
      </main>
    </ToolPageShell>
  );
}
