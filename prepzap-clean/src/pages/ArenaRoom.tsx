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
  const [chatMsg, setChatMsg] = useState("");
  const [chatLog, setChatLog] = useState<{ name: string; text: string; isMe: boolean }[]>([]);

  const fetchRoom = useCallback(async () => {
    if (!code) return;
    const { data } = await supabase.from("exam_rooms").select("*").eq("code", code.toUpperCase()).single();
    if (!data) { navigate("/arena"); return; }
    setRoom(data);
    setIsHost(data.host_id === user?.id);
    if (data.status === "active") { navigate(`/arena/quiz/${code}`); return; }
    if (data.status === "finished") { navigate(`/arena/results/${code}`); return; }
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

  useEffect(() => { fetchRoom(); fetchPlayers(); }, [fetchRoom, fetchPlayers]);

  useEffect(() => {
    if (!room || !user) return;
    const channel = supabase.channel(`room:${room.code}`, { config: { presence: { key: user.id } } });
    channel
      .on("presence", { event: "sync" }, fetchPlayers)
      .on("broadcast", { event: "start" }, ({ payload }) => {
        if (payload?.startTime) navigate(`/arena/quiz/${code}`);
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setChatLog((prev) => [...prev, { name: payload.name, text: payload.text, isMe: payload.user_id === user.id }]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "exam_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const updated = payload.new as ExamRoom;
          if (updated.status === "active") navigate(`/arena/quiz/${code}`);
          if (updated.status === "finished") navigate(`/arena/results/${code}`);
        })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Player";
          await channel.track({ user_id: user.id, display_name: displayName, status: myStatus });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [room, user, code, navigate, myStatus, fetchPlayers]);

  const sendChat = async () => {
    if (!chatMsg.trim() || !room || !user) return;
    const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Player";
    const channel = supabase.channel(`room:${room.code}`);
    await channel.send({ type: "broadcast", event: "chat", payload: { user_id: user.id, name: displayName, text: chatMsg.trim() } });
    setChatLog((prev) => [...prev, { name: "You", text: chatMsg.trim(), isMe: true }]);
    setChatMsg("");
  };

  const toggleReady = async () => {
    if (!room || !user) return;
    const newStatus = myStatus === "waiting" ? "ready" : "waiting";
    await supabase.from("room_presence").update({ status: newStatus }).eq("room_id", room.id).eq("user_id", user.id);
    setMyStatus(newStatus);
  };

  const handleStart = async () => {
    if (!room || !isHost) return;
    setStarting(true);
    for (let i = 3; i >= 1; i--) { setCountdown(i); await new Promise((r) => setTimeout(r, 1000)); }
    setCountdown(null);
    await supabase.from("exam_rooms").update({ status: "active" }).eq("id", room.id);
    const channel = supabase.channel(`room:${room.code}`);
    await channel.send({ type: "broadcast", event: "start", payload: { startTime: Date.now() } });
    navigate(`/arena/quiz/${code}`);
  };

  const handleLeave = async () => {
    if (!room || !user) return;
    await supabase.from("room_presence").delete().eq("room_id", room.id).eq("user_id", user.id);
    navigate("/arena");
  };

  if (loading) return (
    <div className="min-h-[100dvh] bg-[#f5f0e8] flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
    </div>
  );
  if (!room) return null;

  const readyCount = players.filter((p) => p.status === "ready").length;

  // ── Shared player grid ───────────────────────────────────────────────────
  const PlayerGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {players.map((player) => {
        const isMe = player.user_id === user?.id;
        const playerIsHost = player.user_id === room.host_id;
        return (
          <div key={player.user_id}
            className={`border-2 border-black p-3 flex flex-col items-center gap-2 bg-white shadow-[2px_2px_0px_0px_#000] relative ${isMe ? "border-[#f0a040] shadow-[2px_2px_0px_0px_#f0a040]" : ""}`}>
            {playerIsHost && (
              <span className="absolute -top-2.5 -right-2.5 bg-[#f0a040] border-2 border-black text-[9px] font-black px-1.5 py-0.5">HOST</span>
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
      {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
        <div key={`empty-${i}`} className="border-2 border-dashed border-black/30 p-3 flex flex-col items-center justify-center gap-2 min-h-[110px]">
          <span className="material-symbols-outlined text-[28px] text-black/20">person_add</span>
          <p className="text-[10px] font-bold text-black/25 uppercase">Empty</p>
        </div>
      ))}
    </div>
  );

  const ActionButtons = () => (
    <div className="flex flex-col gap-3">
      {isHost && room.mode === "live" ? (
        <button onClick={handleStart} disabled={starting}
          className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {starting ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Starting...</> : <><span className="material-symbols-outlined text-[18px]">play_arrow</span>Start Quiz</>}
        </button>
      ) : room.mode === "open" ? (
        <button onClick={() => navigate(`/arena/quiz/${code}`)}
          className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2">
          Start My Attempt <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      ) : (
        <button onClick={toggleReady}
          className={`w-full font-bold text-[15px] py-3.5 border-2 border-black transition-all flex items-center justify-center gap-2 ${myStatus === "ready" ? "bg-[#f0a040] text-black shadow-[4px_4px_0px_0px_#000]" : "bg-black text-white shadow-[4px_4px_0px_0px_#f0a040]"} active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}>
          <span className="material-symbols-outlined text-[18px]">{myStatus === "ready" ? "check_circle" : "radio_button_unchecked"}</span>
          {myStatus === "ready" ? "Ready!" : "I'm Ready"}
        </button>
      )}
      <button onClick={handleLeave} className="text-center text-[12px] font-bold text-[#E8534A] uppercase tracking-wide">Leave Room</button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8]">
      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <span className="font-black text-[120px] text-[#f0a040] leading-none">{countdown}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#f5f0e8] border-b-[1.5px] border-black px-4 md:px-8 py-3 flex justify-between items-center">
        <button onClick={handleLeave} className="flex items-center gap-1 font-bold text-[13px] text-black/60">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>Leave
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E8534A] animate-pulse" />
          <span className="font-bold text-[13px] uppercase tracking-wider">{room.mode === "live" ? "Live Room" : "Open Challenge"}</span>
        </div>
        <div className="font-mono font-black text-[14px] border-2 border-black px-3 py-1 bg-white shadow-[2px_2px_0px_0px_#000]">{room.code}</div>
      </header>

      {/* ── Mobile layout ── */}
      <div className="md:hidden flex flex-col gap-5 px-4 pt-5 pb-40">
        {/* Room info */}
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="font-black text-[18px] text-black">{room.room_name}</h2>
              <p className="text-[12px] text-black/50 mt-0.5">{room.topic}</p>
            </div>
            <span className={`text-[11px] font-bold px-2 py-1 border-2 border-black ${room.mode === "live" ? "bg-[#E8534A] text-white" : "bg-[#f0a040] text-black"}`}>
              {room.mode.toUpperCase()}
            </span>
          </div>
          <div className="flex gap-3 text-[11px] font-bold text-black/50">
            <span>{room.question_count}Q</span><span>{room.time_limit}m</span><span className="capitalize">{room.difficulty}</span>
          </div>
        </div>
        <div>
          <p className="font-black text-[12px] uppercase tracking-wider text-black/50 mb-2">Players ({players.length}) · {readyCount}/{players.length} ready</p>
          <PlayerGrid />
        </div>
      </div>

      {/* Mobile bottom actions */}
      <div className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-[#f5f0e8] border-t-2 border-black px-4 py-4 z-20">
        <ActionButtons />
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Center — room info + player grid */}
        <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6">
          {/* Room info card */}
          <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-6 relative overflow-hidden">
            <div className="absolute -top-3 -right-3 rotate-6">
              <span className={`text-[11px] font-bold px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000] ${room.mode === "live" ? "bg-[#E8534A] text-white" : "bg-[#f0a040] text-black"}`}>
                {room.mode.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="font-black text-[32px] text-black leading-tight">{room.room_name}</h1>
                <p className="text-[14px] text-black/50 mt-1 flex items-center gap-3">
                  <span>{room.question_count} Questions</span>
                  <span>·</span>
                  <span>{room.time_limit} min</span>
                  <span>·</span>
                  <span className="capitalize">{room.difficulty}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-[18px] border-2 border-black px-3 py-1.5 bg-[#f5f0e8] tracking-widest shadow-[2px_2px_0px_0px_#000]">{room.code}</span>
                <button onClick={() => navigator.clipboard.writeText(room.code)}
                  className="border-2 border-black p-2 bg-white shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
              </div>
            </div>
          </div>

          {/* Players */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-[14px] uppercase tracking-wider">Players ({players.length}) · {readyCount}/{players.length} ready</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#E8534A] animate-pulse" />
                <span className="text-[12px] font-bold text-black/50">Waiting for host...</span>
              </div>
            </div>
            <PlayerGrid />
          </div>

          {/* Action buttons on desktop */}
          <div className="max-w-sm">
            <ActionButtons />
          </div>
        </div>

        {/* Right panel — chat */}
        <aside className="w-[300px] border-l-2 border-black flex flex-col bg-white">
          <div className="border-b-2 border-black px-4 py-3 bg-[#f0a040]">
            <h3 className="font-black text-[14px] text-black flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">forum</span>Room Chat
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {chatLog.length === 0 && (
              <p className="text-[12px] text-black/30 font-bold text-center mt-4">No messages yet.</p>
            )}
            {chatLog.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-0.5 ${msg.isMe ? "items-end" : "items-start"}`}>
                <span className="text-[10px] font-bold text-black/40">{msg.name}</span>
                <div className={`px-3 py-2 border-2 border-black text-[13px] font-medium max-w-[85%] ${msg.isMe ? "bg-black text-white shadow-[2px_2px_0px_0px_#f0a040]" : "bg-[#f5f0e8] text-black shadow-[2px_2px_0px_0px_#000]"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-black p-3 flex gap-2">
            <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type a message..."
              className="flex-1 border-2 border-black px-3 py-2 text-[13px] font-medium focus:outline-none bg-[#f5f0e8]" />
            <button onClick={sendChat}
              className="w-9 h-9 bg-black text-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#f0a040] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
