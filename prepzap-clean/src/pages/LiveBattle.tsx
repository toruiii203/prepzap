import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { SharedSidebar } from "@/components/SharedSidebar";
import { callGroq, safeParseJSON } from "@/lib/groq";
import { loadLibrary, type SourceFile } from "@/lib/sourceContext";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { fireConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  mode: "live" | "open";
  difficulty: string;
  question_count: number;
  time_limit: number;
  status: string;
  host_id: string;
  created_at: string;
  is_public: boolean;
  questions?: Question[];
}

interface Player {
  user_id: string;
  display_name: string;
  score: number;
  isHost?: boolean;
}

// Simple profanity filter
const BLOCKED_WORDS = ["fuck", "shit", "bitch", "asshole", "dick", "pussy", "nigger", "faggot", "cunt", "nazi"];
function cleanNickname(name: string): string {
  let cleaned = name.trim();
  for (const word of BLOCKED_WORDS) {
    const reg = new RegExp(word, "gi");
    cleaned = cleaned.replace(reg, "***");
  }
  return cleaned || "Player";
}

function generateNumericPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function LiveBattle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Navigation / View State
  const [view, setView] = useState<"hub" | "review" | "lobby" | "play">("hub");

  // PIN Input State
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [joinNickname, setJoinNickname] = useState("");
  const [joining, setJoining] = useState(false);

  // Active / Public Rooms
  const [publicRooms, setPublicRooms] = useState<ExamRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Create Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(5);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(20);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [libraryFiles, setLibraryFiles] = useState<SourceFile[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceFile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Studio / Question Review State
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Active Live Battle Room State
  const [activeRoom, setActiveRoom] = useState<ExamRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // In-Game State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showQuestionResult, setShowQuestionResult] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(20);
  const [userScore, setUserScore] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1);

  // Pre-fill PIN from query param if available
  useEffect(() => {
    const qPin = searchParams.get("pin");
    if (qPin && qPin.length === 6) {
      setPinDigits(qPin.split(""));
    }
  }, [searchParams]);

  // Load Library sources
  useEffect(() => {
    try {
      setLibraryFiles(loadLibrary());
    } catch {
      setLibraryFiles([]);
    }
  }, []);

  // Fetch Waiting Public Rooms
  const fetchPublicRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase
        .from("exam_rooms")
        .select("*")
        .eq("status", "waiting")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (!error && Array.isArray(data)) {
        setPublicRooms(data);
      }
    } catch {}
    setLoadingRooms(false);
  }, []);

  useEffect(() => {
    fetchPublicRooms();
  }, [fetchPublicRooms]);

  // Handle PIN input typing
  const handlePinChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...pinDigits];
    updated[index] = digit;
    setPinDigits(updated);

    if (digit && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const fullPin = pinDigits.join("");

  // Join Room by 6-digit PIN
  const handleJoinByPin = async (overridePin?: string) => {
    const targetPin = (overridePin || fullPin).trim().toUpperCase();
    if (targetPin.length !== 6) {
      toast.error("Please enter a valid 6-digit PIN.");
      return;
    }
    setJoining(true);
    playPop();

    try {
      const { data: room, error } = await supabase
        .from("exam_rooms")
        .select("*")
        .eq("code", targetPin)
        .maybeSingle();

      if (error || !room) {
        toast.error("Room not found. Check the PIN and try again.");
        setJoining(false);
        return;
      }

      if (room.status === "finished") {
        toast.error("This room has already ended.");
        setJoining(false);
        return;
      }

      // Enter Lobby
      setActiveRoom(room);
      setIsHost(room.host_id === user?.id);
      setView("lobby");
      connectToRealtime(room);
    } catch {
      toast.error("Failed to connect to room.");
    } finally {
      setJoining(false);
    }
  };

  // Generate Questions for Studio Review
  const handleGenerateQuestions = async () => {
    if (!roomName.trim()) {
      toast.error("Please enter a room name.");
      return;
    }
    const topicText = topic.trim() || selectedSource?.name;
    if (!topicText) {
      toast.error("Please enter a topic or select a source file.");
      return;
    }

    setIsGenerating(true);
    playPop();

    try {
      const sourceSnippet = selectedSource
        ? `\n\nSource Content Excerpt:\n${(selectedSource.fullText || selectedSource.preview || "").slice(0, 3000)}`
        : "";

      const prompt = `Generate exactly ${questionCount} engaging, high-yield multiple-choice quiz questions for university/high-school students on: "${topicText}".
${sourceSnippet}
Difficulty: ${difficulty}.
Return ONLY a valid JSON array of objects with NO markdown formatting, with this schema:
[
  {
    "question": "What is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Brief explanation why Option A is correct."
  }
]`;

      const raw = await callGroq(
        [{ role: "user", content: prompt }],
        undefined,
        "openai/gpt-oss-20b",
        4096,
        "live_battle_gen"
      );

      const parsed = safeParseJSON<Question[]>(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setGeneratedQuestions(parsed);
        setShowCreateModal(false);
        setView("review");
        playSuccess();
        toast.success("Questions generated! Review and edit before launching.");
      } else {
        throw new Error("Invalid question format received.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate questions. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Launch Room after review
  const handleLaunchRoom = async () => {
    if (generatedQuestions.length === 0) {
      toast.error("You need at least 1 question to launch a room.");
      return;
    }
    if (!user) {
      toast.error("You must be signed in to host a live room.");
      return;
    }

    playPop();
    const pin = generateNumericPin();

    try {
      const { data, error } = await supabase
        .from("exam_rooms")
        .insert({
          code: pin,
          host_id: user.id,
          room_name: roomName.trim(),
          topic: topic.trim() || selectedSource?.name || "General Study",
          questions: generatedQuestions,
          mode: "live",
          difficulty,
          question_count: generatedQuestions.length,
          time_limit: secondsPerQuestion,
          status: "waiting",
          is_public: true
        })
        .select()
        .single();

      if (error) throw error;

      setActiveRoom(data);
      setIsHost(true);
      setView("lobby");
      connectToRealtime(data);
      toast.success(`Room live! Share PIN ${pin} with classmates.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to launch room.");
    }
  };

  // Realtime Channel Connection
  const connectToRealtime = useCallback((room: ExamRoom) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`live_battle_${room.code}`, {
      config: { presence: { key: user?.id || `guest_${Date.now()}` } }
    });

    const myName = cleanNickname(
      joinNickname || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Player"
    );

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const active: Player[] = [];
        for (const key in state) {
          const pres = state[key] as any;
          if (Array.isArray(pres) && pres[0]) {
            active.push({
              user_id: key,
              display_name: pres[0].name || "Player",
              score: pres[0].score || 0,
              isHost: pres[0].isHost || false
            });
          }
        }
        setPlayers(active);
      })
      .on("broadcast", { event: "start_battle" }, () => {
        playSuccess();
        setView("play");
        setCurrentQuestionIndex(0);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setShowQuestionResult(false);
      })
      .on("broadcast", { event: "next_question" }, ({ payload }) => {
        setCurrentQuestionIndex(payload.index);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setShowQuestionResult(false);
        setQuestionTimeLeft(room.time_limit || 20);
      })
      .on("broadcast", { event: "kicked" }, ({ payload }) => {
        if (payload.userId === user?.id) {
          toast.error("You were removed from this room by the host.");
          setView("hub");
          setActiveRoom(null);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: myName,
            isHost: room.host_id === user?.id,
            score: 0
          });
        }
      });

    channelRef.current = channel;
  }, [user, joinNickname]);

  // Host starts battle
  const handleHostStartBattle = async () => {
    if (!activeRoom || !channelRef.current) return;
    playSuccess();
    try {
      await supabase
        .from("exam_rooms")
        .update({ status: "active" })
        .eq("code", activeRoom.code);

      await channelRef.current.send({
        type: "broadcast",
        event: "start_battle",
        payload: {}
      });

      setView("play");
      setCurrentQuestionIndex(0);
      setHasAnswered(false);
      setSelectedAnswer(null);
      setShowQuestionResult(false);
    } catch {}
  };

  // Host kicks player
  const handleKickPlayer = (playerUserId: string) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "kicked",
      payload: { userId: playerUserId }
    });
    setPlayers((prev) => prev.filter((p) => p.user_id !== playerUserId));
    toast.success("Player removed.");
  };

  // Question Timer Countdown
  useEffect(() => {
    if (view !== "play" || showQuestionResult) return;
    const timer = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto reveal when time runs out
          setShowQuestionResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [view, showQuestionResult, currentQuestionIndex]);

  // Current active question
  const currentQ: Question | undefined = useMemo(() => {
    if (!activeRoom?.questions || !activeRoom.questions[currentQuestionIndex]) {
      return generatedQuestions[currentQuestionIndex];
    }
    return activeRoom.questions[currentQuestionIndex];
  }, [activeRoom, generatedQuestions, currentQuestionIndex]);

  // Answer selection (anti-cheat: does not reveal answer until timer expires or submitted)
  const handleSelectOption = (option: string) => {
    if (hasAnswered || showQuestionResult || !currentQ) return;
    playTap();
    setSelectedAnswer(option);
    setHasAnswered(true);

    const isCorrect = option.trim().toLowerCase() === currentQ.correct_answer.trim().toLowerCase();
    if (isCorrect) {
      const bonus = Math.max(10, Math.round(questionTimeLeft * 10));
      setUserScore((prev) => prev + (100 * streakMultiplier) + bonus);
      setStreakMultiplier((prev) => prev + 1);
    } else {
      setStreakMultiplier(1);
    }

    // Reveal result immediately for student
    setShowQuestionResult(true);
  };

  const handleNextQuestion = () => {
    playTap();
    const nextIdx = currentQuestionIndex + 1;
    const totalQ = activeRoom?.questions?.length || generatedQuestions.length;

    if (nextIdx >= totalQ) {
      // Completed!
      fireConfetti();
      toast.success("Battle completed! Great work!");
      setView("hub");
      setActiveRoom(null);
      return;
    }

    if (isHost && channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "next_question",
        payload: { index: nextIdx }
      });
    }

    setCurrentQuestionIndex(nextIdx);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setShowQuestionResult(false);
    setQuestionTimeLeft(activeRoom?.time_limit || 20);
  };

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen text-black flex flex-col font-body-md flex-1">
      <SharedSidebar active="/rooms" />

      <div className="md:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-5xl w-full mx-auto space-y-6 pb-28 md:pb-12">

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW: MAIN HUB (JOIN PIN + CREATE CTA + PUBLIC ROOMS)              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {view === "hub" && (
            <>
              {/* Header */}
              <header className="pb-1 border-b-2 border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-black/20 bg-white text-[10.5px] font-black uppercase tracking-wider text-black/60 mb-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#FF4D2E]">sensors</span>
                    Live Battle
                  </div>
                  <h1 className="text-[26px] md:text-[32px] font-black leading-tight text-black">
                    Live Battle Rooms
                  </h1>
                  <p className="text-[13px] font-bold text-black/60 mt-0.5">
                    Fast-paced multiplayer quiz showdowns. Enter a 6-digit PIN to jump in or host a room for your class.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2.5 bg-[#FFD13B] hover:bg-[#FF4D2E] hover:text-white text-black border-2 border-black rounded-xl font-black text-[13px] shadow-[3px_3px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>+ Host Battle</span>
                </button>
              </header>

              {/* ── 6-DIGIT PIN ENTRY HERO BOX (Kahoot style) ── */}
              <div className="border-3 border-black rounded-3xl bg-white p-6 md:p-8 shadow-[4px_4px_0px_#1A1A1A] text-center space-y-5">
                <div>
                  <span className="inline-block px-3 py-1 bg-[#FFFBEA] border border-black/20 rounded-full text-[11px] font-black uppercase tracking-wider text-[#FF4D2E] mb-2">
                    Enter Game PIN
                  </span>
                  <h2 className="text-[20px] md:text-[24px] font-black text-black">
                    Got a 6-Digit Room Code?
                  </h2>
                  <p className="text-[12.5px] font-bold text-black/55 mt-1">
                    Ask your teacher or host for the PIN on their screen.
                  </p>
                </div>

                {/* 6 Digit Input Boxes */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-md mx-auto">
                  {pinDigits.map((d, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (pinInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      placeholder="•"
                      className="w-11 h-14 sm:w-14 sm:h-16 text-center text-[22px] sm:text-[26px] font-black border-2 border-black rounded-xl bg-[#FAF7F2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#1A1A1A] transition-all"
                    />
                  ))}
                </div>

                {/* Nickname input if guest */}
                <div className="max-w-xs mx-auto">
                  <input
                    type="text"
                    value={joinNickname}
                    onChange={(e) => setJoinNickname(e.target.value)}
                    placeholder="Your nickname (e.g. SpeedScholar)..."
                    maxLength={20}
                    className="w-full px-3.5 py-2 border-2 border-black rounded-xl text-[13px] font-bold text-center bg-[#FAF7F2] focus:bg-white focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    disabled={fullPin.length !== 6 || joining}
                    onClick={() => handleJoinByPin()}
                    className="px-8 py-3 bg-black hover:bg-[#FF4D2E] text-white border-2 border-black rounded-xl font-black text-[14px] uppercase tracking-wider shadow-[3px_3px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {joining ? "Connecting..." : "Join Battle"}
                  </button>
                </div>
              </div>

              {/* ── OPEN PUBLIC ROOMS ── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-black uppercase tracking-wider text-black flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#FF4D2E]">public</span>
                    <span>Live Public Lobbies ({publicRooms.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={fetchPublicRooms}
                    className="text-[11px] font-bold text-black/50 hover:text-black flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingRooms ? (
                  <div className="p-8 text-center text-xs font-bold text-black/40">Loading active rooms...</div>
                ) : publicRooms.length === 0 ? (
                  <div className="border-2 border-dashed border-black/25 rounded-2xl bg-white p-8 text-center space-y-2">
                    <p className="text-[13px] font-medium text-black/60">
                      No public rooms currently waiting. Host one above and invite your study circle!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {publicRooms.map((room) => (
                      <div
                        key={room.id}
                        className="border-2 border-black rounded-2xl p-4 bg-white shadow-[2px_2px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1A1A1A] transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-md border border-black/20 bg-[#FFE566] text-black text-[10px] font-black uppercase tracking-wide">
                              PIN: {room.code}
                            </span>
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Waiting
                            </span>
                          </div>
                          <h4 className="text-[15px] font-black text-black leading-tight line-clamp-1">
                            {room.room_name}
                          </h4>
                          <p className="text-[11.5px] font-bold text-black/50 line-clamp-1 mt-1">
                            {room.topic}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/10 text-[11px] font-bold text-black/60">
                          <span>{room.question_count} Questions</span>
                          <button
                            type="button"
                            onClick={() => handleJoinByPin(room.code)}
                            className="px-3 py-1 bg-black hover:bg-[#FF4D2E] text-white rounded-lg text-[10.5px] font-black cursor-pointer shadow-xs active:scale-95 transition-colors"
                          >
                            Join &rarr;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW: QUESTION STUDIO & REVIEW (HOST EDITS BEFORE OPENING ROOM)    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {view === "review" && (
            <div className="space-y-6">
              <header className="pb-2 border-b-2 border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FFE566] text-black font-black text-[10.5px] border border-black mb-1">
                    Host Studio
                  </span>
                  <h2 className="text-[24px] font-black text-black">
                    Review Questions: {roomName}
                  </h2>
                  <p className="text-[12px] font-bold text-black/60">
                    Review and fine-tune questions before opening the live lobby to players.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView("hub")}
                    className="px-3 py-2 bg-white hover:bg-stone-100 text-black border-2 border-black rounded-xl text-[11.5px] font-black cursor-pointer shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLaunchRoom}
                    className="px-4 py-2 bg-[#10B981] hover:bg-black hover:text-white text-black border-2 border-black rounded-xl text-[12px] font-black shadow-[2px_2px_0px_#1A1A1A] cursor-pointer transition-colors"
                  >
                    Open Live Room &rarr;
                  </button>
                </div>
              </header>

              <div className="space-y-4">
                {generatedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="border-2 border-black rounded-2xl p-4 md:p-5 bg-white shadow-[2px_2px_0px_#1A1A1A] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-black/50">
                        Question {idx + 1} of {generatedQuestions.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedQuestions((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Delete Question
                      </button>
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGeneratedQuestions((prev) => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], question: val };
                          return updated;
                        });
                      }}
                      className="w-full px-3 py-2 border-2 border-black rounded-xl text-[14px] font-extrabold bg-[#FAF7F2] focus:bg-white outline-none"
                    />

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = opt.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border-2 flex items-center justify-between gap-2 ${
                              isCorrect ? "border-[#10B981] bg-emerald-50" : "border-black/30 bg-white"
                            }`}
                          >
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneratedQuestions((prev) => {
                                  const updated = [...prev];
                                  const newOpts = [...updated[idx].options];
                                  newOpts[oIdx] = val;
                                  updated[idx] = { ...updated[idx], options: newOpts };
                                  return updated;
                                });
                              }}
                              className="flex-1 bg-transparent text-[12px] font-bold outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setGeneratedQuestions((prev) => {
                                  const updated = [...prev];
                                  updated[idx] = { ...updated[idx], correct_answer: opt };
                                  return updated;
                                });
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer border ${
                                isCorrect
                                  ? "bg-[#10B981] text-white border-[#10B981]"
                                  : "bg-black/5 text-black/50 border-black/20 hover:bg-black/10"
                              }`}
                            >
                              {isCorrect ? "Correct ✓" : "Mark Correct"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW: LIVE LOBBY (WAITING FOR PLAYERS, REALTIME PRESENCE, PIN)    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {view === "lobby" && activeRoom && (
            <div className="space-y-6">
              {/* Giant PIN Banner */}
              <div className="border-3 border-black rounded-3xl bg-[#FFD13B] p-6 md:p-8 shadow-[4px_4px_0px_#1A1A1A] text-center space-y-3">
                <span className="text-[12px] font-black uppercase tracking-wider text-black/70">
                  Join at Studenius Live Battle with PIN
                </span>
                <div className="text-[44px] md:text-[64px] font-black tracking-widest text-black font-mono">
                  {activeRoom.code}
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeRoom.code);
                      toast.success("PIN copied to clipboard!");
                    }}
                    className="px-3.5 py-1.5 bg-black hover:bg-[#FF4D2E] text-white rounded-xl text-[11px] font-black border-2 border-black cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">content_copy</span>
                    <span>Copy PIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/rooms?pin=${activeRoom.code}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Room invite link copied!");
                    }}
                    className="px-3.5 py-1.5 bg-white hover:bg-black hover:text-white text-black rounded-xl text-[11px] font-black border-2 border-black cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">share</span>
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>

              {/* Lobby Status & Players Grid */}
              <div className="border-2 border-black rounded-2xl bg-white p-5 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-[16px] font-black text-black">
                      Connected Players ({players.length})
                    </h3>
                  </div>

                  {isHost ? (
                    <button
                      type="button"
                      onClick={handleHostStartBattle}
                      className="px-5 py-2 bg-[#FF4D2E] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[12px] uppercase tracking-wider shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      Start Battle Now &rarr;
                    </button>
                  ) : (
                    <span className="text-[12px] font-bold text-black/50 italic">
                      Waiting for host to start battle...
                    </span>
                  )}
                </div>

                {players.length === 0 ? (
                  <div className="p-8 text-center text-[13px] font-medium text-black/50">
                    Waiting for players to join with PIN <strong className="text-black font-black">{activeRoom.code}</strong>...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {players.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#FAF7F2] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-black text-white text-[10px] font-black flex items-center justify-center shrink-0">
                            {p.display_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[12px] font-black text-black truncate">
                            {p.display_name} {p.isHost && "(Host)"}
                          </span>
                        </div>

                        {/* Host Kick Button */}
                        {isHost && !p.isHost && (
                          <button
                            type="button"
                            onClick={() => handleKickPlayer(p.user_id)}
                            className="text-black/30 hover:text-rose-600 text-[13px] font-bold cursor-pointer"
                            title="Kick player"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* VIEW: PLAY (KAHOOT-STYLE 4-COLOR BATTLE CHOICES + TIMER)           */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {view === "play" && currentQ && (
            <div className="space-y-6">
              {/* Top Progress & Timer Bar */}
              <div className="flex items-center justify-between gap-3 bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#1A1A1A]">
                <div>
                  <span className="text-[10.5px] font-black uppercase text-black/50">
                    Question {currentQuestionIndex + 1} of {activeRoom?.questions?.length || generatedQuestions.length}
                  </span>
                  <div className="text-[14px] font-black text-black">
                    Score: {userScore} pts {streakMultiplier > 1 && `(${streakMultiplier}x)`}
                  </div>
                </div>

                {/* Big Circular Countdown */}
                <div className={`w-12 h-12 rounded-full border-3 border-black flex items-center justify-center font-black text-[18px] shadow-xs ${
                  questionTimeLeft <= 5 ? "bg-[#FF4D2E] text-white animate-pulse" : "bg-[#FFD13B] text-black"
                }`}>
                  {questionTimeLeft}
                </div>
              </div>

              {/* Question Statement */}
              <div className="border-3 border-black rounded-3xl bg-white p-6 md:p-8 shadow-[4px_4px_0px_#1A1A1A] text-center">
                <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-black text-black leading-snug">
                  {currentQ.question}
                </h2>
              </div>

              {/* 4 Chunky Answer Choices (Kahoot Colors: Coral, Blue, Yellow, Mint) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentQ.options.map((opt, oIdx) => {
                  const colors = [
                    "bg-[#FF4D2E] text-white hover:bg-[#e03d1f]",
                    "bg-[#3B82F6] text-white hover:bg-[#2563eb]",
                    "bg-[#FFD13B] text-black hover:bg-[#ecc028]",
                    "bg-[#10B981] text-white hover:bg-[#059669]",
                  ];
                  const symbols = ["change_history", "diamond", "circle", "square"];
                  const isCorrect = opt.trim().toLowerCase() === currentQ.correct_answer.trim().toLowerCase();
                  const isSelected = selectedAnswer === opt;

                  let borderClass = "border-3 border-black";
                  if (showQuestionResult) {
                    if (isCorrect) borderClass = "border-4 border-emerald-400 ring-4 ring-emerald-300";
                    else if (isSelected) borderClass = "border-4 border-rose-600 opacity-60";
                    else borderClass = "border-3 border-black opacity-30";
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      disabled={hasAnswered || showQuestionResult}
                      onClick={() => handleSelectOption(opt)}
                      className={`min-h-[78px] md:min-h-[92px] p-4 rounded-2xl ${borderClass} ${colors[oIdx % 4]} shadow-[3px_3px_0px_#1A1A1A] active:translate-y-1 active:shadow-none flex items-center gap-3.5 text-left transition-all cursor-pointer disabled:cursor-default`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">{symbols[oIdx % 4]}</span>
                      </div>
                      <span className="text-[14px] md:text-[16px] font-black leading-snug flex-1">
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next Button when answered / timed out */}
              {showQuestionResult && (
                <div className="border-2 border-black rounded-2xl p-4 bg-white shadow-[3px_3px_0px_#1A1A1A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black uppercase tracking-wider text-black/60">
                      Answer Reveal
                    </span>
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="px-4 py-1.5 bg-black hover:bg-[#FF4D2E] text-white rounded-xl text-[12px] font-black border-2 border-black shadow-xs cursor-pointer transition-colors"
                    >
                      Next Question &rarr;
                    </button>
                  </div>
                  <p className="text-[13px] font-bold text-black/80">
                    {currentQ.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── CREATE ROOM MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="border-3 border-black bg-white rounded-3xl p-6 max-w-lg w-full shadow-[5px_5px_0px_#000] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/10">
              <h3 className="text-[18px] font-black text-black flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF4D2E]">sensors</span>
                <span>Host a Live Battle</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full border border-black flex items-center justify-center font-black cursor-pointer hover:bg-black/5"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Bio 101 Midterm Clash"
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                  Topic / Syllabus
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Krebs Cycle"
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[13px] font-bold outline-none"
                />
              </div>

              {libraryFiles.length > 0 && (
                <div>
                  <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                    Or Use Source File
                  </label>
                  <select
                    value={selectedSource?.id || ""}
                    onChange={(e) => {
                      const found = libraryFiles.find((f) => f.id === e.target.value);
                      setSelectedSource(found || null);
                    }}
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-[12px] font-bold outline-none bg-white"
                  >
                    <option value="">None (Use typed topic)</option>
                    {libraryFiles.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                    Questions
                  </label>
                  <div className="flex border-2 border-black rounded-xl overflow-hidden">
                    {([5, 10, 15] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`flex-1 py-1.5 text-[12px] font-black ${
                          questionCount === cnt ? "bg-black text-white" : "bg-white text-black hover:bg-stone-50"
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                    Timer / Question
                  </label>
                  <div className="flex border-2 border-black rounded-xl overflow-hidden">
                    {[15, 20, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSecondsPerQuestion(sec)}
                        className={`flex-1 py-1.5 text-[12px] font-black ${
                          secondsPerQuestion === sec ? "bg-black text-white" : "bg-white text-black hover:bg-stone-50"
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 border-2 border-black rounded-xl text-[12px] font-black hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateQuestions}
                className="px-4 py-2 bg-[#FFD13B] hover:bg-black hover:text-white border-2 border-black rounded-xl text-[12px] font-black shadow-[2px_2px_0px_#1A1A1A] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? "Generating Questions..." : "Generate & Review →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
