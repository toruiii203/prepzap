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

export default function ArenaInvite() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<RoomPreview | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [fetching, setFetching] = useState(true);

  // Auto-redirect if already logged in
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
        .single();
      if (error || !data) {
        setFetchError("Room not found or has already ended.");
      } else {
        setRoom(data as RoomPreview);
      }
      setFetching(false);
    })();
  }, [code]);

  const redirectParam = `?redirect=/arena/room/${code}`;

  if (authLoading || (user && code)) return null; // redirecting

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="font-black text-[28px] tracking-tight text-black">studenius</p>
          <p className="text-[13px] text-black/50 font-medium mt-0.5">Arena Invite</p>
        </div>

        {fetching ? (
          <div className="border-[2px] border-black bg-white shadow-[4px_4px_0px_#000] px-6 py-8 text-center">
            <span className="material-symbols-outlined text-[32px] animate-spin text-black/40">progress_activity</span>
            <p className="mt-3 text-[14px] font-medium text-black/50">Loading room...</p>
          </div>
        ) : fetchError ? (
          <div className="border-[2px] border-black bg-white shadow-[4px_4px_0px_#000] px-6 py-8 text-center">
            <span className="material-symbols-outlined text-[40px] text-red-400">error</span>
            <p className="mt-3 text-[15px] font-bold text-black">{fetchError}</p>
            <button onClick={() => navigate("/arena")}
              className="mt-5 w-full bg-black text-white font-bold py-3 border-2 border-black shadow-[3px_3px_0px_#ae2925]">
              Go to Arena
            </button>
          </div>
        ) : room && (
          <>
            {/* Room card */}
            <div className="border-[2px] border-black bg-white shadow-[4px_4px_0px_#000] px-5 py-5 mb-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-black text-[18px] text-black leading-tight">{room.room_name}</p>
                  <p className="text-[12px] text-black/50 font-medium mt-0.5 uppercase tracking-wide">
                    {room.mode === "live" ? "Live Room" : "Open Challenge"}
                  </p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-1 border ${DIFF_COLOR[room.difficulty]} capitalize`}>
                  {room.difficulty}
                </span>
              </div>

              <p className="text-[13px] text-black/70 font-medium border-l-[3px] border-[#ae2925] pl-3 mb-4 line-clamp-3">
                {room.topic}
              </p>

              <div className="flex gap-3">
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-black/60">
                  <span className="material-symbols-outlined text-[16px]">quiz</span>
                  {room.question_count} questions
                </div>
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-black/60">
                  <span className="material-symbols-outlined text-[16px]">
                    {room.status === "waiting" ? "hourglass_empty" : "sensors"}
                  </span>
                  {room.status === "waiting" ? "Waiting to start" : "In progress"}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate(`/login${redirectParam}`)}
                className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_#ae2925] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                Sign In to Join
              </button>
              <button onClick={() => navigate(`/signup${redirectParam}`)}
                className="w-full bg-[#FAF7F2] text-black font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                Create Account
              </button>
            </div>

            <p className="text-center text-[11px] text-black/40 font-medium mt-4">
              Invited via code <span className="font-black text-black/70">{code?.toUpperCase()}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
