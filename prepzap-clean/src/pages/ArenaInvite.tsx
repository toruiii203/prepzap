import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
  is_public: boolean;
}

export default function ArenaInvite() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<ExamRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    supabase.from("exam_rooms").select("*").eq("code", code.toUpperCase()).single()
      .then(({ data }) => {
        if (!data) { setNotFound(true); }
        else { setRoom(data); }
        setLoading(false);
      });
  }, [code]);

  // If logged in, go straight to the room
  useEffect(() => {
    if (user && room) navigate(`/arena/room/${room.code}`, { replace: true });
  }, [user, room, navigate]);

  if (loading) return (
    <div className="min-h-[100dvh] bg-[#f5f0e8] flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-[36px]">progress_activity</span>
    </div>
  );

  if (notFound) return (
    <div className="min-h-[100dvh] bg-[#f5f0e8] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="material-symbols-outlined text-[56px] text-black/20">search_off</span>
      <h1 className="font-black text-[24px]">Room not found</h1>
      <p className="text-[14px] font-bold text-black/50">This room may have ended or the code is invalid.</p>
      <button onClick={() => navigate("/arena")}
        className="mt-2 bg-black text-white font-extrabold px-8 py-3 border-2 border-black shadow-[3px_3px_0px_0px_#f0a040]">
        Go to Arena
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#f5f0e8] flex flex-col items-center justify-center px-4">
      {/* Studenius brand */}
      <div className="mb-8 text-center">
        <h1 className="font-black text-[32px] tracking-tight">Studenius</h1>
        <p className="text-[13px] font-bold text-black/50">Study smarter. Compete harder.</p>
      </div>

      {/* Invite card */}
      <div className="w-full max-w-[420px] border-2 border-black bg-white shadow-[6px_6px_0px_0px_#000] overflow-hidden">
        {/* Header */}
        <div className="bg-[#f0a040] border-b-2 border-black px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">sports_esports</span>
            <span className="font-black text-[13px] uppercase tracking-widest">You're Invited!</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 border-2 border-black ${room!.mode === "live" ? "bg-black text-white" : "bg-white text-black"}`}>
            {room!.mode.toUpperCase()}
          </span>
        </div>

        {/* Room details */}
        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <h2 className="font-black text-[26px] leading-tight">{room!.room_name}</h2>
            <p className="text-[14px] text-black/60 font-bold mt-1">{room!.topic}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "quiz", label: "Questions", value: `${room!.question_count}Q` },
              { icon: "timer", label: "Time Limit", value: `${room!.time_limit}m` },
              { icon: "trending_up", label: "Difficulty", value: room!.difficulty },
            ].map(({ icon, label, value }) => (
              <div key={label} className="border-2 border-black p-3 flex flex-col items-center gap-1 bg-[#f5f0e8]">
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                <span className="font-black text-[15px] capitalize">{value}</span>
                <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>

          {/* Room code */}
          <div className="border-2 border-black bg-[#f5f0e8] p-3 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-black/50">Room Code</span>
            <span className="font-mono font-black text-[20px] tracking-widest">{room!.code}</span>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={() => navigate(`/login?redirect=/arena/room/${room!.code}`)}
              className="w-full bg-black text-white font-extrabold text-[15px] py-4 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2">
              Sign in to Join <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
            <button onClick={() => navigate(`/signup?redirect=/arena/room/${room!.code}`)}
              className="w-full bg-white text-black font-extrabold text-[15px] py-4 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2">
              Create free account <span className="material-symbols-outlined text-[18px]">person_add</span>
            </button>
          </div>

          <p className="text-center text-[11px] text-black/30 font-bold">
            Studenius is free. No credit card needed.
          </p>
        </div>
      </div>

      <p className="mt-6 text-[12px] font-bold text-black/30">
        studenius.com · AI-powered study tools
      </p>
    </div>
  );
}
