import { useState, useEffect, useCallback } from "react";
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
  host_id: string;
}

interface Player {
  user_id: string;
  display_name: string;
  status: "waiting" | "ready";
}

export default function ArenaRoom() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState<ExamRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myStatus, setMyStatus] = useState<"waiting" | "ready">("waiting");
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!code) return;
    const { data } = await supabase.from("exam_rooms").select("*").eq("code", code.toUpperCase()).single();
    if (!data) { navigate("/arena"); return; }
    setRoom(data);
    setIsHost(data.host_id === user?.id);

    // If room already active, go straight to quiz
    if (data.status === "active") {
      navigate(`/arena/quiz/${code}`);
      return;
    }
    if (data.status === "finished") {
      navigate(`/arena/results/${code}`);
      return;
    }
    setLoading(false);
  }, [code, user?.id, navigate]);

  const fetchPlayers = useCallback(async () => {
    if (!code) return;
    const { data: roomData } = await supabase.from("exam_rooms").select("id").eq("code", code.toUpperCase()).single();
    if (!roomData) return;
    const { data } = await supabase.from("room_presence").select("user_id, display_name, status").eq("room_id", roomData.id);
    setPlayers((data ?? []) as Player[]);
    const me = (data ?? []).find((p: any) => p.user_id === user?.id);
    if (me) setMyStatus(me.status as "waiting" | "ready");
  }, [code, user?.id]);

  useEffect(() => {
    fetchRoom();
    fetchPlayers();
  }, [fetchRoom, fetchPlayers]);

  // Supabase Realtime — presence + broadcast
  useEffect(() => {
    if (!room || !user) return;

    const channel = supabase.channel(`room:${room.code}`, { config: { presence: { key: user.id } } });

    channel
      .on("presence", { event: "sync" }, fetchPlayers)
      .on("broadcast", { event: "start" }, ({ payload }) => {
        // Host broadcasts start — all players redirect
        if (payload?.startTime) {
          navigate(`/arena/quiz/${code}`);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "exam_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const updated = payload.new as ExamRoom;
          if (updated.status === "active") navigate(`/arena/quiz/${code}`);
          if (updated.status === "finished") navigate(`/arena/results/${code}`);
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Player";
          await channel.track({ user_id: user.id, display_name: displayName, status: myStatus });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [room, user, code, navigate, myStatus, fetchPlayers]);

  const toggleReady = async () => {
    if (!room || !user) return;
    const newStatus = myStatus === "waiting" ? "ready" : "waiting";
    await supabase.from("room_presence")
      .update({ status: newStatus })
      .eq("room_id", room.id)
      .eq("user_id", user.id);
    setMyStatus(newStatus);
  };

  const handleStart = async () => {
    if (!room || !isHost) return;
    setStarting(true);

    // Countdown 3..2..1
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);

    // Update room status to active
    await supabase.from("exam_rooms").update({ status: "active" }).eq("id", room.id);

    // Broadcast to all players
    const channel = supabase.channel(`room:${room.code}`);
    await channel.send({ type: "broadcast", event: "start", payload: { startTime: Date.now() } });

    navigate(`/arena/quiz/${code}`);
  };

  const handleLeave = async () => {
    if (!room || !user) return;
    await supabase.from("room_presence").delete().eq("room_id", room.id).eq("user_id", user.id);
    navigate("/arena");
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f0e8] flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
      </div>
    );
  }

  if (!room) return null;

  const readyCount = players.filter((p) => p.status === "ready").length;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8] pb-6">
      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <span className="font-black text-[120px] text-[#f0a040] leading-none">{countdown}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#f5f0e8] border-b-[1.5px] border-black px-4 py-3 flex justify-between items-center">
        <button onClick={handleLeave} className="flex items-center gap-1 font-bold text-[13px] text-black/60">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Leave
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E8534A] animate-pulse" />
          <span className="font-bold text-[13px] uppercase tracking-wider">
            {room.mode === "live" ? "Live Room" : "Open Challenge"}
          </span>
        </div>
      </header>

      <main className="flex flex-col gap-5 px-4 pt-5">
        {/* Room info */}
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Room Code</p>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-[20px] text-black tracking-widest border-2 border-black px-2 py-0.5 bg-[#f5f0e8]">
                  {room.code}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(room.code)}
                  className="border-2 border-black p-1.5 bg-white shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2 py-1 border-2 border-black ${room.mode === "live" ? "bg-[#E8534A] text-white" : "bg-[#f0a040] text-black"}`}>
              {room.mode.toUpperCase()}
            </span>
          </div>
          <div className="border-t-2 border-black pt-3">
            <h2 className="font-black text-[18px] text-black leading-tight">{room.room_name}</h2>
            <div className="flex gap-3 mt-1.5 text-[11px] font-bold text-black/50">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">quiz</span>{room.question_count}Q</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">timer</span>{room.time_limit}m</span>
              <span className="capitalize">{room.difficulty}</span>
            </div>
          </div>
          <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-[80px] text-black/5 pointer-events-none">sports_esports</span>
        </div>

        {/* Players */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-[14px] uppercase tracking-wider text-black">
              Players ({players.length})
            </h3>
            <span className="text-[11px] font-bold text-black/40">{readyCount}/{players.length} ready</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {players.map((player) => {
              const isMe = player.user_id === user?.id;
              const playerIsHost = player.user_id === room.host_id;
              return (
                <div key={player.user_id}
                  className={`border-2 border-black p-3 flex flex-col items-center gap-2 bg-white shadow-[2px_2px_0px_0px_#000] relative ${isMe ? "border-[#f0a040]" : ""}`}>
                  {playerIsHost && (
                    <span className="absolute -top-2.5 -right-2.5 bg-[#f0a040] border-2 border-black text-[10px] font-black px-1.5 py-0.5">HOST</span>
                  )}
                  <div className={`w-11 h-11 rounded-full border-2 border-black flex items-center justify-center font-black text-[16px] ${isMe ? "bg-black text-white" : "bg-[#f5f0e8]"}`}>
                    {player.display_name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-bold text-[13px] text-black truncate w-full text-center">{isMe ? "You" : player.display_name}</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 border border-black ${player.status === "ready" ? "bg-[#E8534A] text-white" : "bg-black/5 text-black/50"}`}>
                    {player.status.toUpperCase()}
                  </span>
                </div>
              );
            })}

            {/* Empty slots up to 8 */}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="border-2 border-dashed border-black/30 p-3 flex flex-col items-center justify-center gap-2 min-h-[110px]">
                <span className="material-symbols-outlined text-[28px] text-black/20">person_add</span>
                <p className="text-[10px] font-bold text-black/25 uppercase">Empty</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-[#f5f0e8] border-t-2 border-black px-4 py-4 flex flex-col gap-3 z-20">
        {isHost && room.mode === "live" ? (
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {starting ? (
              <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Starting...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">play_arrow</span>Start Quiz</>
            )}
          </button>
        ) : room.mode === "open" ? (
          <button
            onClick={() => navigate(`/arena/quiz/${code}`)}
            className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            Start My Attempt
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        ) : (
          <button
            onClick={toggleReady}
            className={`w-full font-bold text-[15px] py-3.5 border-2 border-black transition-all flex items-center justify-center gap-2 ${
              myStatus === "ready"
                ? "bg-[#f0a040] text-black shadow-[4px_4px_0px_0px_#000]"
                : "bg-black text-white shadow-[4px_4px_0px_0px_#f0a040]"
            } active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}
          >
            <span className="material-symbols-outlined text-[18px]">{myStatus === "ready" ? "check_circle" : "radio_button_unchecked"}</span>
            {myStatus === "ready" ? "Ready!" : "I'm Ready"}
          </button>
        )}
        <button onClick={handleLeave} className="text-center text-[12px] font-bold text-[#E8534A] uppercase tracking-wide">
          Leave Room
        </button>
      </div>
    </div>
  );
}
