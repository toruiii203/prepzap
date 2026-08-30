import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface RoomPreview {
  room_name: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  question_count: number;
  mode: "live" | "open";
  status: string;
}

const DIFF_COLOR: Record<string, string> = {
  easy: "bg-green-100 text-green-800 border-green-400",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-400",
  hard: "bg-red-100 text-red-800 border-red-400",
};

const DIFF_LABEL: Record<string, string> = {
  easy: "Easy 🟢",
  medium: "Medium 🟡",
  hard: "Hard 🔴",
};

export default function ArenaInvite() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<RoomPreview | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && user && code) {
      navigate(`/arena/room/${code}`, { replace: true });
    }
  }, [authLoading, user, code, navigate]);

  useEffect(() => {
    if (!code) return;
    (async () => {
      setFetching(true);
      const { data, error } = await supabase
        .from("exam_rooms")
        .select("room_name, topic, difficulty, question_count, mode, status")
        .eq("code", code.toUpperCase())
        .neq("status", "finished")
        .maybeSingle();
      if (error || !data) {
        setFetchError("Room not found or has already ended.");
      } else {
        setRoom(data as RoomPreview);
      }
      setFetching(false);
    })();
  }, [code]);

  const redirectParam = `?redirect=/arena/room/${code}`;

  if (authLoading || (user && code)) return null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col items-center">

        {/* Header */}
        <p className="font-black text-[13px] uppercase tracking-[0.2em] text-black/40 mb-2">studenius arena</p>

        {fetching ? (
          <div className="w-full border-[2px] border-black bg-white shadow-[4px_4px_0px_#000] px-6 py-12 text-center mt-4">
            <span className="material-symbols-outlined text-[32px] animate-spin text-black/30">progress_activity</span>
            <p className="mt-3 text-[14px] font-medium text-black/40">Loading room...</p>
          </div>
        ) : fetchError ? (
          <div className="w-full border-[2px] border-black bg-white shadow-[4px_4px_0px_#000] px-6 py-10 text-center mt-4">
            <img src="/fox/fox-surprised.png" alt="Fox surprised" className="w-24 h-24 object-contain mx-auto mb-4" />
            <p className="text-[16px] font-black text-black">Oops!</p>
            <p className="text-[13px] text-black/50 mt-1">{fetchError}</p>
            <button onClick={() => navigate("/arena")}
              className="mt-5 w-full bg-black text-white font-bold py-3 border-2 border-black shadow-[3px_3px_0px_#ae2925]">
              Go to Arena
            </button>
          </div>
        ) : room && (
          <>
            {/* Invite headline */}
            <h1 className="font-black text-[28px] text-black text-center leading-tight mb-1">
              You're invited to<br />a quiz battle! ⚔️
            </h1>
            <p className="text-[13px] text-black/50 font-medium text-center mb-6">
              Someone challenged you on Studenius Arena
            </p>

            {/* Fox peeking above card */}
            <div className="relative w-full">
              <img
                src="/fox/fox-peeking.png"
                alt="Fox peeking"
                className="absolute -top-16 left-1/2 -translate-x-1/2 w-28 h-28 object-contain z-10 pointer-events-none"
              />

              {/* Room card */}
              <div className="w-full border-[2px] border-black bg-white shadow-[4px_4px_0px_#000] pt-16 pb-5 px-5">
                {/* Mode banner */}
                <div className={`w-full text-center py-1.5 mb-4 text-[11px] font-black uppercase tracking-widest border-b-2 border-black ${room.mode === "live" ? "bg-[#FF4D2E] text-white" : "bg-[#f0a040] text-black"}`}>
                  {room.mode === "live" ? "⚡ Live Room — Everyone starts together" : "🕐 Open Challenge — Join anytime"}
                </div>

                <h2 className="font-black text-[22px] text-black leading-tight text-center mb-1">{room.room_name}</h2>
                <p className="text-[12px] text-black/50 text-center font-medium mb-4 line-clamp-2">{room.topic}</p>

                {/* Stats row */}
                <div className="flex justify-center gap-4 mb-4">
                  <div className="flex flex-col items-center border-2 border-black px-4 py-2 bg-[#FAF7F2]">
                    <span className="font-black text-[20px] text-black">{room.question_count}</span>
                    <span className="text-[10px] font-bold text-black/50 uppercase tracking-wide">Questions</span>
                  </div>
                  <div className={`flex flex-col items-center border-2 px-4 py-2 ${DIFF_COLOR[room.difficulty]}`}>
                    <span className="font-black text-[14px] capitalize">{room.difficulty}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">Difficulty</span>
                  </div>
                  <div className="flex flex-col items-center border-2 border-black px-4 py-2 bg-[#FAF7F2]">
                    <span className={`font-black text-[11px] ${room.status === "waiting" ? "text-black/50" : "text-green-600"}`}>
                      {room.status === "waiting" ? "Waiting" : "Active"}
                    </span>
                    <span className="text-[10px] font-bold text-black/50 uppercase tracking-wide">Status</span>
                  </div>
                </div>

                <p className="text-center text-[11px] text-black/30 font-medium">
                  Code: <span className="font-black text-black/60 tracking-widest">{code?.toUpperCase()}</span>
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 w-full mt-5">
              <button onClick={() => navigate(`/login${redirectParam}`)}
                className="w-full bg-black text-white font-bold text-[15px] py-4 border-2 border-black shadow-[4px_4px_0px_#ae2925] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">login</span>
                Sign In to Join
              </button>
              <button onClick={() => navigate(`/signup${redirectParam}`)}
                className="w-full bg-[#FAF7F2] text-black font-bold text-[15px] py-4 border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Create Free Account
              </button>
            </div>

            <p className="text-center text-[11px] text-black/30 font-medium mt-5">
              Don't have an account? It's free — takes 30 seconds.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
