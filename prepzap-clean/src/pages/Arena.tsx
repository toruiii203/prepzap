import { getOrCreateDailyChallenge } from "@/lib/dailyChallenge";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { callGroq, safeParseJSON } from "@/lib/groq";
import { loadLibrary, type SourceFile } from "@/lib/sourceContext";
import { withTimeout } from "@/lib/withTimeout";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DailyQuiz {
  id: string;
  date: string;
  topic: string;
  difficulty: string;
  questions: Question[];
}

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface LeaderboardEntry {
  user_id: string;
  score: number;
  time_taken: number;
  display_name: string;
}

interface ExamRoom {
  id: string;
  code: string;
  room_name: string;
  topic: string;
  mode: "live" | "open";
  difficulty: string;
  question_count: number;
  time_limit: number;
  status: string;
  host_id: string;
  deadline: string | null;
  created_at: string;
  is_public: boolean;
}

type LeaderboardTab = "today" | "alltime";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function todayPH(): string {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Manila', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());
}

function generateCode(): string {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const D = "0123456789";
  const rL = () => L[Math.floor(Math.random() * L.length)];
  const rD = () => D[Math.floor(Math.random() * D.length)];
  return `${rL()}${rL()}-${rD()}${rD()}${rD()}${rD()}`;
}

async function generateQuestions(topic: string, count: number, difficulty: string): Promise<Question[]> {
  const prompt = `Generate ${count} multiple choice questions about "${topic}" at ${difficulty} difficulty for university-level students.
Return ONLY a JSON array, no markdown, no explanation:
[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correct_answer":"A","explanation":"..."}]`;
  // FIX: added feature key for tracking; no limit gate (host pays per creation)
  const raw = await callGroq(
    [{ role: "user", content: prompt }],
    undefined,
    "openai/gpt-oss-20b",
    8192,
    "arena_gen"
  );
  return safeParseJSON<Question[]>(raw);
}

// ── Create Room Modal ─────────────────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (code: string) => void }) {
  const { user } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState<5 | 10 | 20>(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [mode, setMode] = useState<"live" | "open">("live");
  const [timeLimit, setTimeLimit] = useState(15);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceFile | null>(null);
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    try { setSources(loadLibrary()); } catch { setSources([]); }
  }, []);

  const handleCreate = async () => {
    if (!roomName.trim()) { setError("Room name is required."); return; }
    if (!selectedSource && !topic.trim()) { setError("Enter a topic or pick a source from your library."); return; }
    if (!user) return;
    setLoading(true); setError("");
    try {
      setLoadingMsg("Generating questions with AI...");
      const effectiveTopic = selectedSource
        ? `${topic.trim() || selectedSource.name}\n\nSource Material:\n${(selectedSource.fullText || selectedSource.preview || selectedSource.name).slice(0, 3000)}`
        : topic.trim();
      let questions;
        try {
          questions = await generateQuestions(effectiveTopic, questionCount, difficulty);
        } catch (err: any) {
          console.error("AI Generation failed:", err);
          throw new Error("AI Generation failed: " + (err.message || "Unknown error"));
        }
      setLoadingMsg("Creating room...");
      let code = generateCode();
      for (let i = 0; i < 10; i++) {
        const { data: ex, error: checkErr } = await supabase.from("exam_rooms").select("id").eq("code", code).maybeSingle();
          if (checkErr && checkErr.code !== "PGRST116") {
            console.error("Supabase code check failed:", checkErr);
            throw new Error("Database error during code check: " + checkErr.message);
          }
        if (!ex) break;
        code = generateCode();
      }
      const topicLabel = topic.trim() || selectedSource?.name || "Untitled";
      const { error: insertError } = await supabase.from("exam_rooms").insert({
        code, host_id: user.id, room_name: roomName.trim(), topic: topicLabel,
        questions, mode, difficulty, question_count: questionCount, time_limit: timeLimit, status: "waiting", is_public: isPublic,
      });
      if (insertError) {
          console.error("Supabase insert failed:", insertError);
          throw new Error("Database error during room creation: " + insertError.message);
        }
      onCreated(code);
    } catch (e: any) {
      setError(e.message ?? "Failed to create room. Try again.");
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full md:w-[520px] md:max-h-[85vh] bg-[#f5f0e8] md:rounded-none rounded-t-[24px] border-t-[3px] md:border-[3px] border-l-[3px] border-r-[3px] border-black flex flex-col relative"
        style={{ maxHeight: "90dvh" }}>
        <div className="flex flex-col items-center md:items-start pt-3 pb-3 px-5 border-b-2 border-black sticky top-0 bg-[#f5f0e8] rounded-t-[24px] md:rounded-none z-10">
          <div className="w-10 h-1 bg-black/20 rounded-full mb-3 md:hidden" />
          <div className="w-full flex justify-between items-center">
            <h2 className="font-bold text-[18px] text-black">Create a Room</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-full bg-white">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 pb-32">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider">Room Name</label>
            <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Chem Finals Grind"
              className="w-full bg-white border-2 border-black px-3 py-2.5 text-[15px] font-medium placeholder:text-black/30 focus:outline-none shadow-[2px_2px_0px_0px_#000]" />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-end">
              <label className="text-[11px] font-bold uppercase tracking-wider">Topic / Material</label>
              <span className="text-[10px] font-bold text-[#f0a040] flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[13px]">bolt</span>AI Generated
              </span>
            </div>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="Describe the topic or paste your notes..." rows={3}
              className="w-full bg-white border-2 border-black px-3 py-2.5 text-[15px] font-medium placeholder:text-black/30 focus:outline-none shadow-[2px_2px_0px_0px_#000] resize-none" />
          </div>

          {/* Source Library picker */}
          {sources.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider">From Source Library</label>
              <div className="relative">
                <button onClick={() => setShowSources(s => !s)}
                  className="w-full bg-white border-2 border-black px-3 py-2.5 text-left text-[13px] font-medium flex justify-between items-center shadow-[2px_2px_0px_0px_#000]">
                  <span className={selectedSource ? "text-black" : "text-black/30"}>
                    {selectedSource ? selectedSource.name : "Pick a source (optional)"}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">{showSources ? "expand_less" : "expand_more"}</span>
                </button>
                {showSources && (
                  <div className="absolute top-full left-0 right-0 z-20 bg-white border-2 border-black border-t-0 max-h-40 overflow-y-auto shadow-[3px_3px_0px_0px_#000]">
                    <button onClick={() => { setSelectedSource(null); setShowSources(false); }}
                      className="w-full px-3 py-2.5 text-left text-[13px] text-black/40 font-medium border-b border-black/10 hover:bg-black/5">
                      None
                    </button>
                    {sources.map((s) => (
                      <button key={s.id} onClick={() => { setSelectedSource(s); setShowSources(false); }}
                        className={`w-full px-3 py-2.5 text-left text-[13px] font-medium border-b border-black/10 last:border-0 hover:bg-[#f0a040]/20 ${selectedSource?.id === s.id ? "bg-[#f0a040]/30 font-bold" : ""}`}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedSource && (
                <p className="text-[11px] text-black/50 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  AI will use this source to generate questions
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider">Questions</label>
              <div className="flex border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0px_0px_#000]">
                {([5, 10, 20] as const).map((n, i) => (
                  <button key={n} onClick={() => setQuestionCount(n)}
                    className={`flex-1 py-2.5 text-[13px] font-bold transition-colors ${questionCount === n ? "bg-black text-white" : "bg-white text-black"} ${i < 2 ? "border-r-2 border-black" : ""}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider">Difficulty</label>
              <div className="flex border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0px_0px_#000]">
                {(["easy", "medium", "hard"] as const).map((d, i) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2.5 text-[13px] font-bold capitalize transition-colors ${difficulty === d ? "bg-black text-white" : "bg-white text-black"} ${i < 2 ? "border-r-2 border-black" : ""}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-wider">Room Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(["live", "open"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`w-full border-2 border-black p-3 text-left flex items-start gap-3 transition-all ${mode === m ? "bg-[#f0a040] shadow-[3px_3px_0px_0px_#000]" : "bg-white shadow-[2px_2px_0px_0px_#000]"}`}>
                  <span className="material-symbols-outlined text-[20px] mt-0.5">{m === "live" ? "sensors" : "schedule"}</span>
                  <div>
                    <p className="font-bold text-[14px] text-black">{m === "live" ? "Live Room" : "Open Challenge"}</p>
                    <p className="text-[12px] text-black/60 mt-0.5">
                      {m === "live" ? "Everyone starts at the same time." : "Async — join anytime before deadline."}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider">Time Limit (minutes)</label>
            <div className="flex gap-2 flex-wrap items-center">
              {[5, 10, 15, 30, 45, 60, 90, 120].map((t) => (
                <button key={t} onClick={() => setTimeLimit(t)}
                  className={`px-4 py-2 border-2 border-black text-[13px] font-bold transition-all ${timeLimit === t ? "bg-black text-white shadow-[2px_2px_0px_0px_#f0a040]" : "bg-white text-black shadow-[2px_2px_0px_0px_#000]"}`}>
                  {t}m
                </button>
              ))}
              <div className="flex items-center gap-1 border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0px_0px_#000]">
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={timeLimit}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setTimeLimit(Math.min(480, Math.max(1, v)));
                  }}
                  className="w-14 text-[13px] font-bold text-black text-center outline-none"
                />
                <span className="text-[11px] font-bold text-black/50">min custom</span>
              </div>
            </div>
            <p className="text-[10px] text-black/40 font-medium">Up to 8 hours — pick a preset or type your own.</p>
          </div>

          <div className="flex items-center justify-between border-2 border-black px-3 py-3 bg-white shadow-[2px_2px_0px_0px_#000]">
            <div>
              <p className="font-bold text-[14px] text-black">Public Room</p>
              <p className="text-[11px] text-black/50 mt-0.5">Visible to everyone in the lobby</p>
            </div>
            <button onClick={() => setIsPublic(p => !p)}
              className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${isPublic ? "bg-[#f0a040]" : "bg-white"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-black rounded-full transition-all ${isPublic ? "left-6" : "left-0.5"}`} />
            </button>
          </div>

          {error && <p className="text-[13px] text-red-600 border-2 border-red-400 px-3 py-2 bg-red-50">{error}</p>}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-[#f5f0e8] border-t-2 border-black px-5 py-4">
          <p className="text-center text-[11px] text-black/40 mb-2">{loadingMsg || "Room code generated automatically."}</p>
          <button onClick={handleCreate} disabled={loading}
            className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>{loadingMsg}</>
              : <>Generate & Create Room<span className="material-symbols-outlined text-[18px]">arrow_forward</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Join Room Modal ───────────────────────────────────────────────────────────
function JoinRoomModal({ onClose, onJoined }: { onClose: () => void; onJoined: (code: string) => void }) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Player");
  const [room, setRoom] = useState<ExamRoom | null>(null);
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const normalized = code.toUpperCase().trim();
    if (normalized.length !== 7) { setRoom(null); setError(""); return; }
    const lookup = async () => {
      setChecking(true); setError("");
      const { data } = await supabase.from("exam_rooms").select("*").eq("code", normalized).neq("status", "finished").maybeSingle();
      setRoom(data ?? null);
      if (!data) setError("Room not found or already finished.");
      setChecking(false);
    };
    lookup();
  }, [code]);

  const handleJoin = async () => {
    if (!room || !user) return;
    setJoining(true); setError("");
    try {
      const { error: err } = await supabase.from("room_presence").upsert(
        { room_id: room.id, user_id: user.id, display_name: displayName.trim() || "Player", status: "waiting" },
        { onConflict: "room_id,user_id" }
      );
      if (err) throw err;
      onJoined(room.code);
    } catch (e: any) {
      setError(e.message ?? "Failed to join."); setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full md:w-[440px] bg-[#f5f0e8] rounded-t-[24px] md:rounded-none border-t-[3px] md:border-[3px] border-l-[3px] border-r-[3px] border-black flex flex-col">
        <div className="flex flex-col items-center md:items-start pt-3 pb-3 px-5 border-b-2 border-black rounded-t-[24px] md:rounded-none">
          <div className="w-10 h-1 bg-black/20 rounded-full mb-3 md:hidden" />
          <div className="w-full flex justify-between items-center">
            <h2 className="font-bold text-[18px] text-black">Join a Room</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-full bg-white">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <div className="px-5 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider">Room Code</label>
            <div className="relative">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XK-4821"
                maxLength={7} className="w-full bg-white border-[3px] border-black px-4 py-3 text-center font-mono text-[22px] font-bold uppercase tracking-widest focus:outline-none shadow-[3px_3px_0px_0px_#000]" />
              {checking && <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-black/40 animate-spin">progress_activity</span>}
              {room && !checking && <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-[#f0a040]">check_circle</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white border-2 border-black px-3 py-2.5 text-[15px] font-medium focus:outline-none shadow-[2px_2px_0px_0px_#000]" />
          </div>

          {room && (
            <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] relative">
              <div className="absolute -top-3 -right-2 bg-[#a3e635] text-black border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase flex items-center gap-1">
                Room found <span className="material-symbols-outlined text-[12px]">check</span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-[16px] text-black">{room.room_name}</h3>
                  <p className="text-[12px] text-black/50 mt-0.5">{room.topic}</p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-1 border-2 border-black flex items-center gap-1 ${room.mode === "live" ? "bg-[#FF4D2E] text-white" : "bg-[#f0a040] text-black"}`}>
                  {room.mode === "live" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  {room.mode.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-3 mt-3 text-[11px] font-bold text-black/50">
                <span>{room.question_count}Q</span><span>{room.time_limit}m</span><span className="capitalize">{room.difficulty}</span>
              </div>
            </div>
          )}

          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <p className="text-[11px] text-black/40 text-center">Make sure you're ready before joining a Live Room.</p>
          <button onClick={handleJoin} disabled={!room || joining}
            className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {joining ? "Joining..." : "Join Room"}<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Arena Page ───────────────────────────────────────────────────────────
export default function Arena() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuiz | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>("today");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [leaderboardRetryTick, setLeaderboardRetryTick] = useState(0);
  const [roomsError, setRoomsError] = useState(false);
  const [roomsRetryTick, setRoomsRetryTick] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const deleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
      await supabase.from("exam_rooms").delete().eq("id", roomId);
      // The realtime channel will automatically reload the list
    } catch (err) {
      console.error("Failed to delete room:", err);
      alert("Failed to delete room.");
    }
  };

  const shareRoom = (code: string) => {
    const url = `${window.location.origin}/invite/${code}`;
    if (navigator.share) {
      navigator.share({ title: "Join my Studenius Arena room!", url });
    } else {
      navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  useEffect(() => {
    const tick = () => {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
      setCountdown(`${h}:${m}:${s}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingQuiz(true);
      const today = todayPH();
      try {
        const quiz = await getOrCreateDailyChallenge();
        setDailyQuiz(quiz ?? null);
        if (quiz && user) {
          const localDone = localStorage.getItem(`pz_daily_done_${today}_${user.id}`) || localStorage.getItem(`pz_daily_done_${today}`);
          if (localDone) {
            setAlreadySubmitted(true);
          } else {
            const { data: sub } = await supabase
              .from("daily_challenge_submissions")
              .select("id")
              .eq("challenge_date", today)
              .eq("user_id", user.id)
              .maybeSingle();
            if (sub) {
              setAlreadySubmitted(true);
              try { localStorage.setItem(`pz_daily_done_${today}_${user.id}`, "true"); } catch {}
            } else {
              setAlreadySubmitted(false);
            }
          }
        }
      } catch (err) {
        console.error("Error loading daily quiz:", err);
      } finally {
        setLoadingQuiz(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingLeaderboard(true);
      setLeaderboardError(false);
      let entries: LeaderboardEntry[] = [];
      let fetchFailed = false;
      try {
        let query = supabase.from("daily_challenge_submissions").select("user_id, score, time_taken_seconds, display_name")
          .order("score", { ascending: false }).order("time_taken_seconds", { ascending: true }).limit(20);
        if (leaderboardTab === "today") query = query.eq("challenge_date", todayPH());
        // Guarded with a timeout: every supabase.from() call awaits
        // auth.getSession() internally, and if that ever stalls (slow token
        // refresh, backgrounded tab, flaky reconnect) this await would
        // otherwise hang forever with no error — which is what left this
        // leaderboard spinning indefinitely.
        const { data } = await withTimeout(query, 8000, "daily leaderboard");
        if (data) {
          entries = data.map((row, i) => ({
            user_id: row.user_id,
            score: row.score,
            time_taken: row.time_taken_seconds,
            display_name: row.display_name || `Player ${i + 1}`,
          }));
        }
      } catch (err) {
        console.warn("Leaderboard fetch error:", err);
        fetchFailed = true;
      }

      // Seamlessly merge local today submissions if any
      try {
        const localKey = `pz_daily_submissions_${todayPH()}`;
        const localRaw = localStorage.getItem(localKey);
        if (localRaw) {
          const localList: any[] = JSON.parse(localRaw);
          localList.forEach(item => {
            if (!entries.find(e => e.user_id === item.user_id)) {
              entries.push({
                user_id: item.user_id,
                score: item.score,
                time_taken: item.time_taken_seconds || item.time_taken || 0,
                display_name: item.display_name || "You",
              });
            }
          });
          entries.sort((a, b) => b.score - a.score || a.time_taken - b.time_taken);
        }
      } catch {}

      if (cancelled) return;
      setLeaderboard(entries.slice(0, 10));
      // Only surface an error state if we truly have nothing to show — a
      // local fallback entry still counts as a usable result.
      setLeaderboardError(fetchFailed && entries.length === 0);
      setLoadingLeaderboard(false);
    };
    load();
    const ch = supabase.channel("arena-daily-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_challenge_submissions" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [leaderboardTab, leaderboardRetryTick]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingRooms(true);
      setRoomsError(false);
      try {
        let query = supabase.from("exam_rooms").select("*")
          .in("status", ["waiting", "active"])
          .order("created_at", { ascending: false })
          .limit(20);
          
        if (user) {
          query = query.or(`is_public.eq.true,host_id.eq.${user.id}`);
        } else {
          query = query.eq("is_public", true);
        }

        const { data } = await withTimeout(query, 8000, "exam rooms");
        if (!cancelled) setRooms(data ?? []);
      } catch (err) {
        console.warn("Exam rooms fetch error:", err);
        if (!cancelled) setRoomsError(true);
      } finally {
        if (!cancelled) setLoadingRooms(false);
      }
    };
    load();
    const ch = supabase.channel("arena-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_rooms" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [roomsRetryTick]);

  // ── Shared sub-components ──────────────────────────────────────────────────
  const handleViewBreakdown = () => {
    const today = todayPH();
    let savedState = null;
    try {
      const raw = (user?.id ? localStorage.getItem(`pz_daily_breakdown_${today}_${user.id}`) : null) || localStorage.getItem(`pz_daily_breakdown_${today}`);
      if (raw) savedState = JSON.parse(raw);
    } catch {}
    navigate("/arena/results/daily", { state: savedState });
  };

  const renderDailyCard = () => (
    <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] overflow-hidden">
      <div className="bg-[#f0a040] border-b-2 border-black px-4 py-2 flex justify-between items-center">
        <span className="font-bold text-[11px] uppercase tracking-widest">Daily Challenge</span>
        <span className="font-bold text-[11px]">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>
      {loadingQuiz ? (
        <div className="p-6 flex justify-center"><span className="material-symbols-outlined animate-spin text-[24px] text-black/30">progress_activity</span></div>
      ) : dailyQuiz ? (
        <div className="p-5 flex flex-col gap-3">
          <div>
            <h2 className="font-black text-[20px] text-black leading-tight">{dailyQuiz.topic}</h2>
            <div className="flex gap-2 mt-2">
              {dailyQuiz.difficulty && <span className="text-[10px] font-bold border-2 border-black px-2 py-0.5 capitalize">{dailyQuiz.difficulty}</span>}
              <span className="text-[10px] font-bold border-2 border-black px-2 py-0.5">{dailyQuiz.questions.length} Questions</span>
            </div>
          </div>
          {alreadySubmitted ? (
            <div className="bg-[#FAF7F2] border-2 border-black p-4 flex flex-col gap-2 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-2 text-green-700">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <p className="font-extrabold text-[14px]">Completed Today! ✓</p>
              </div>
              <p className="text-[12px] text-black/60 font-semibold">
                You've completed your 1 daily challenge attempt. Check your rank on the leaderboard below!
              </p>
              <button
                onClick={handleViewBreakdown}
                className="mt-1 w-full bg-white text-black font-bold text-[13px] py-2 border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 hover:bg-black hover:text-white transition-colors"
              >
                View Today's Breakdown →
              </button>
            </div>
          ) : (
            <button onClick={() => navigate("/arena/quiz/daily")}
              className="w-full bg-black text-white font-bold text-[14px] py-3.5 border-2 border-black flex justify-between items-center px-4 shadow-[3px_3px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
              <span>Take Today's Quiz (1 Try)</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          )}
          <p className="text-center text-[11px] text-black/40">Resets in {countdown}</p>
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="font-bold text-[14px] text-black/50">No quiz today yet.</p>
          
        </div>
      )}
    </div>
  );

  const renderLeaderboardCard = () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-[16px] text-black tracking-tight">Daily Challenge Leaderboard</h3>
        <div className="flex gap-1.5">
          {(["today", "alltime"] as const).map((tab) => (
            <button key={tab} onClick={() => setLeaderboardTab(tab)}
              className={`text-[11px] font-bold px-3 py-1 border-2 border-black transition-colors ${leaderboardTab === tab ? "bg-black text-white" : "bg-white text-black"}`}>
              {tab === "today" ? "Today" : "All-Time"}
            </button>
          ))}
        </div>
      </div>
      <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
        {loadingLeaderboard ? (
          <div className="p-6 flex justify-center"><span className="material-symbols-outlined animate-spin text-[24px] text-black/30">progress_activity</span></div>
        ) : leaderboardError ? (
          <div className="p-6 flex flex-col items-center gap-3 text-center">
            <p className="font-bold text-[13px] text-black/40">Couldn't load the leaderboard — connection may be slow.</p>
            <button onClick={() => setLeaderboardRetryTick((t) => t + 1)}
              className="bg-black text-white font-bold text-[12px] px-4 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#f0a040] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
              Retry
            </button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-6 text-center"><p className="font-bold text-[13px] text-black/40">No submissions yet — be first!</p></div>
        ) : leaderboard.map((entry, i) => {
          const isMe = entry.user_id === user?.id;
          const medal = i === 0 ? <span className="material-symbols-outlined text-[#eab308]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> : i === 1 ? <span className="material-symbols-outlined text-[#9ca3af]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> : i === 2 ? <span className="material-symbols-outlined text-[#b45309]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> : null;
          return (
            <div key={entry.user_id + i}
              className={`flex items-center gap-3 px-4 py-3 ${i < leaderboard.length - 1 ? "border-b-2 border-black" : ""} ${isMe ? "bg-[#f0a040]/15" : ""}`}>
              <span className="w-6 text-center font-black text-[14px]">{medal ?? `${i + 1}`}</span>
              <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-black text-[12px] ${isMe ? "bg-[#f0a040] text-black" : "bg-black/10 text-black"}`}>
                {entry.display_name.charAt(0).toUpperCase()}
              </div>
              <span className={`flex-1 text-[14px] truncate ${isMe ? "font-black text-black" : "font-bold text-black"}`}>{entry.display_name}</span>
              <div className="text-right">
                <p className={`font-black text-[14px] ${isMe ? "text-[#f0a040]" : "text-black"}`}>{entry.score.toLocaleString()}</p>
                <p className="text-[10px] text-black/40">{formatTime(entry.time_taken)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRoomsCard = () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-[16px] text-black tracking-tight">Exam Rooms</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)}
            className="bg-black text-white font-bold text-[12px] px-4 py-2 border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#f0a040] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <span className="material-symbols-outlined text-[16px]">add</span>Create
          </button>
          <button onClick={() => setShowJoin(true)}
            className="bg-white text-black font-bold text-[12px] px-4 py-2 border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <span className="material-symbols-outlined text-[16px]">login</span>Join
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {loadingRooms ? (
          <div className="p-4 flex justify-center"><span className="material-symbols-outlined animate-spin text-[24px] text-black/30">progress_activity</span></div>
        ) : roomsError ? (
          <div className="border-2 border-black p-6 flex flex-col items-center gap-3 text-center bg-white">
            <p className="font-bold text-[13px] text-black/40">Couldn't load rooms — connection may be slow.</p>
            <button onClick={() => setRoomsRetryTick((t) => t + 1)}
              className="bg-black text-white font-bold text-[12px] px-4 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#f0a040] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
              Retry
            </button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="border-2 border-dashed border-black p-8 text-center">
            <span className="material-symbols-outlined text-[36px] text-black/20">meeting_room</span>
            <p className="font-bold text-[13px] text-black/40 mt-2">No active rooms.</p>
            <p className="text-[11px] text-black/30 mt-1">Create one and invite friends.</p>
          </div>
        ) : rooms.map((room) => (
          <div key={room.id} className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] p-3 flex justify-between items-center hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] transition-all">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 border border-black ${room.mode === "live" ? "bg-[#FF4D2E] text-white" : "bg-[#f0a040] text-black"}`}>
                  {room.mode.toUpperCase()}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 border border-black/30 ${room.status === "active" ? "bg-green-100 text-green-800" : "bg-black/5 text-black/50"}`}>
                  {room.status.toUpperCase()}
                </span>
                {!room.is_public && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 border border-black/30 bg-black text-white flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">lock</span>PRIVATE
                  </span>
                )}
              </div>
              <h4 className="font-bold text-[14px] text-black truncate">{room.room_name}</h4>
              <p className="text-[11px] text-black/50 mt-0.5 truncate">{room.topic}</p>
              <div className="flex gap-3 mt-1 text-[10px] font-bold text-black/40">
                <span>{room.question_count}Q</span><span>{room.time_limit}m</span><span className="capitalize">{room.difficulty}</span>
              </div>
            </div>
            <div className="ml-3 flex gap-2 flex-shrink-0">
              {user?.id === room.host_id && (
                <button onClick={() => deleteRoom(room.id)}
                  className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white hover:bg-red-50 text-red-600 shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                  title="Delete room">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
              <button onClick={() => shareRoom(room.code)}
                className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                title="Copy invite link">
                <span className="material-symbols-outlined text-[18px]">
                  {copiedCode === room.code ? "check" : "share"}
                </span>
              </button>
              <button onClick={() => navigate(`/arena/room/${room.code}`)}
                className="w-9 h-9 flex items-center justify-center border-2 border-black bg-[#f0a040] shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
                <span className="material-symbols-outlined text-[18px]">login</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8]">
      {/* ── Mobile header ── */}
      <header className="md:hidden sticky top-0 z-30 bg-[#f5f0e8] border-b-[1.5px] border-black px-4 py-3 flex justify-between items-center">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          aria-label="Back to dashboard"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <div className="text-center">
          <h1 className="font-black text-[22px] text-black tracking-tight leading-none">Arena</h1>
          <p className="text-[11px] text-black/50 font-medium mt-0.5">Compete. Rank. Win.</p>
        </div>
        <div className="w-9 h-9 rounded-full border-2 border-black bg-black/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
      </header>

      {/* ── Desktop header ── */}
      <header className="hidden md:flex items-end justify-between px-8 pt-8 pb-4 border-b-2 border-black">
        <div className="flex items-end gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white font-bold text-[13px] shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all mb-1"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>Dashboard
          </button>
          <div>
            <h1 className="font-black text-[36px] text-black tracking-tight leading-none">Arena</h1>
            <p className="text-[13px] text-black/50 font-medium mt-1">Test your knowledge and compete with peers.</p>
          </div>
        </div>
      </header>

      {/* ── Mobile layout ── */}
      <div className="md:hidden flex flex-col gap-6 px-4 pt-5 pb-24">
        {renderDailyCard()}
        {renderLeaderboardCard()}
        {renderRoomsCard()}
      </div>

      {/* ── Desktop layout — bento grid ── */}
      <div className="hidden md:grid grid-cols-12 gap-6 px-8 py-6">
        {/* Left col — Daily + Leaderboard */}
        <div className="col-span-4 flex flex-col gap-6">
          {renderDailyCard()}
          {renderLeaderboardCard()}
        </div>
        {/* Right col — Rooms */}
        <div className="col-span-8">
          {renderRoomsCard()}
        </div>
      </div>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={(code) => { setShowCreate(false); navigate(`/arena/room/${code}`); }} />}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} onJoined={(code) => { setShowJoin(false); navigate(`/arena/room/${code}`); }} />}
    </div>
  );
}

