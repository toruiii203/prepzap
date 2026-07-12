import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

// Presence payload shape tracked into the channel
interface PresencePayload {
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
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  // FIX: stable ref to the channel so sendChat and toggleReady always use the
  // same subscribed instance instead of creating a new disconnected one.
  const channelRef = useRef<RealtimeChannel | null>(null);

  // FIX: stable ref to myStatus so the presence useEffect never needs it as a
  // dep (which was causing the channel to tear down on every ready toggle).
  const myStatusRef = useRef<"waiting" | "ready">("waiting");
  myStatusRef.current = myStatus;

  const getDisplayName = useCallback(() =>
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Player"
  , [user]);

  const shareInvite = () => {
    const url = `${window.location.origin}/invite/${room?.code}`;
    if (navigator.share) {
      navigator.share({ title: `Join "${room?.room_name}" on Studenius Arena!`, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room?.code ?? "");
    setCopied("code");
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Initial room fetch ─────────────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    if (!code) return;
    const { data } = await supabase
      .from("exam_rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();
    if (!data) { navigate("/arena"); return; }
    setRoom(data);
    setIsHost(data.host_id === user?.id);
    // If room already started/finished, redirect immediately
    if (data.status === "active") { navigate(`/arena/quiz/${code}`); return; }
    if (data.status === "finished") { navigate(`/arena/results/${code}`); return; }
    setLoading(false);
  }, [code, user?.id, navigate]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // ── Realtime channel: presence + broadcast + postgres_changes ──────────────
  useEffect(() => {
    if (!room || !user) return;

    const channelName = `room:${room.code}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    // FIX: Read player list directly from Realtime presence state — never from
    // the room_presence DB table (which was always empty because channel.track()
    // is ephemeral and never writes to Postgres).
    const syncPlayers = () => {
      const state = channel.presenceState<PresencePayload>();
      const list: Player[] = Object.values(state).map((entries) => entries[0]);
      setPlayers(list);
      const me = list.find((p) => p.user_id === user.id);
      if (me) setMyStatus(me.status);
    };

    channel
      .on("presence", { event: "sync" }, syncPlayers)
      .on("presence", { event: "join" }, syncPlayers)
      .on("presence", { event: "leave" }, syncPlayers)
      .on("broadcast", { event: "start" }, ({ payload }) => {
        if (payload?.startTime) navigate(`/arena/quiz/${code}`);
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setChatLog((prev) => [
          ...prev,
          { name: payload.name, text: payload.text, isMe: payload.user_id === user.id },
        ]);
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "exam_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const updated = payload.new as ExamRoom;
          if (updated.status === "active") navigate(`/arena/quiz/${code}`);
          if (updated.status === "finished") navigate(`/arena/results/${code}`);
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track this user into presence with their current status
          await channel.track({
            user_id: user.id,
            display_name: getDisplayName(),
            status: myStatusRef.current,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // FIX: myStatus removed from deps — presence re-tracking is handled inside
    // toggleReady directly. Adding it here caused the channel to tear down and
    // rebuild every time someone hit the Ready button.
  }, [room, user, code, navigate, getDisplayName]);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    // FIX: use channelRef instead of creating a new supabase.channel() call
    // which returned an unsubscribed instance and silently dropped messages.
    if (!chatMsg.trim() || !room || !user || !channelRef.current) return;
    await channelRef.current.send({
      type: "broadcast",
      event: "chat",
      payload: { user_id: user.id, name: getDisplayName(), text: chatMsg.trim() },
    });
    setChatLog((prev) => [...prev, { name: "You", text: chatMsg.trim(), isMe: true }]);
    setChatMsg("");
  };

  // ── Ready toggle ───────────────────────────────────────────────────────────
  const toggleReady = async () => {
    if (!channelRef.current || !user) return;
    const newStatus = myStatus === "waiting" ? "ready" : "waiting";
    setMyStatus(newStatus);
    // FIX: update presence track (broadcasts to all) instead of a DB update on
    // a row that may not exist in room_presence.
    await channelRef.current.track({
      user_id: user.id,
      display_name: getDisplayName(),
      status: newStatus,
    });
  };

  // ── Start (host only) ─────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!room || !isHost || !channelRef.current) return;
    setStarting(true);
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);
    // Update DB first so postgres_changes fires for any player who missed the broadcast.
    // NOTE: don't set started_at here — a DB trigger stamps it with the
    // database's own now() the moment status flips to "active". That's what
    // keeps every player's countdown anchored to one shared clock instead of
    // whichever player's device happened to click Start (see ArenaQuiz.tsx).
    await supabase.from("exam_rooms").update({ status: "active" }).eq("id", room.id);
    // FIX: broadcast on the existing subscribed channel ref
    await channelRef.current.send({
      type: "broadcast",
      event: "start",
      payload: { startTime: Date.now() },
    });
    navigate(`/arena/quiz/${code}`);
  };

  // ── Leave ─────────────────────────────────────────────────────────────────
  const handleLeave = async () => {
    if (!room || !user) return;
    // Untrack from presence (removes from everyone's player list immediately)
    if (channelRef.current) await channelRef.current.untrack();
    navigate("/arena");
  };

  // ── Open mode: begin my own attempt ───────────────────────────────────────
  // FIX: track presence so other players can see you joined before navigating
  const handleStartOpenAttempt = async () => {
    if (!channelRef.current || !user) return;
    await channelRef.current.track({
      user_id: user.id,
      display_name: getDisplayName(),
      status: "ready",
    });
    navigate(`/arena/quiz/${code}`);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[100dvh] bg-[#f5f0e8] flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
    </div>
  );
  if (!room) return null;

  const readyCount = players.filter((p) => p.status === "ready").length;

  // ── Sub-components ─────────────────────────────────────────────────────────
  const PlayerGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {players.map((player) => {
        const isMe = player.user_id === user?.id;
        const playerIsHost = player.user_id === room.host_id;
        return (
          <div
            key={player.user_id}
            className={`border-2 border-black p-3 flex flex-col items-center gap-2 bg-white shadow-[2px_2px_0px_0px_#000] relative ${isMe ? "border-[#f0a040] shadow-[2px_2px_0px_0px_#f0a040]" : ""}`}
          >
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
      {/* Empty slots — show at least 4 total slots when under 4 players */}
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
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {starting
            ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Starting...</>
            : <><span className="material-symbols-outlined text-[18px]">play_arrow</span>Start Quiz</>}
        </button>
      ) : room.mode === "open" ? (
        // FIX: use handleStartOpenAttempt so presence is tracked before leaving lobby
        <button
          onClick={handleStartOpenAttempt}
          className="w-full bg-black text-white font-bold text-[15px] py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_#f0a040] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
        >
          Start My Attempt <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      ) : (
        // Non-host live room player — show ready toggle
        <button
          onClick={toggleReady}
          className={`w-full font-bold text-[15px] py-3.5 border-2 border-black transition-all flex items-center justify-center gap-2 ${
            myStatus === "ready"
              ? "bg-[#f0a040] text-black shadow-[4px_4px_0px_0px_#000]"
              : "bg-black text-white shadow-[4px_4px_0px_0px_#f0a040]"
          } active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {myStatus === "ready" ? "check_circle" : "radio_button_unchecked"}
          </span>
          {myStatus === "ready" ? "Ready!" : "I'm Ready"}
        </button>
      )}
      <button
        onClick={handleLeave}
        className="text-center text-[12px] font-bold text-[#E8534A] uppercase tracking-wide py-1"
      >
        Leave Room
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8]">

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
          <p className="text-white font-bold text-[16px] uppercase tracking-widest opacity-60">Starting in</p>
          <span className="font-black text-[120px] text-[#f0a040] leading-none">{countdown}</span>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-[#f5f0e8] border-b-[1.5px] border-black px-4 md:px-8 py-3 flex justify-between items-center">
        <button onClick={handleLeave} className="flex items-center gap-1 font-bold text-[13px] text-black/60">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>Leave
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E8534A] animate-pulse" />
          <span className="font-bold text-[13px] uppercase tracking-wider">
            {room.mode === "live" ? "Live Room" : "Open Challenge"}
          </span>
        </div>
        <div className="font-mono font-black text-[14px] border-2 border-black px-3 py-1 bg-white shadow-[2px_2px_0px_0px_#000]">
          {room.code}
        </div>
      </header>

      {/* ════════════ MOBILE ════════════ */}
      <div className="md:hidden flex flex-col gap-5 px-4 pt-5 pb-48">

        {/* Room info */}
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0 pr-3">
              <h2 className="font-black text-[18px] text-black leading-tight">{room.room_name}</h2>
              <p className="text-[12px] text-black/50 mt-0.5 truncate">{room.topic}</p>
            </div>
            <span className={`text-[11px] font-bold px-2 py-1 border-2 border-black flex-shrink-0 ${room.mode === "live" ? "bg-[#E8534A] text-white" : "bg-[#f0a040] text-black"}`}>
              {room.mode.toUpperCase()}
            </span>
          </div>
          <div className="flex gap-3 text-[11px] font-bold text-black/50">
            <span>{room.question_count}Q</span>
            <span>·</span>
            <span>{room.time_limit}m</span>
            <span>·</span>
            <span className="capitalize">{room.difficulty}</span>
          </div>
        </div>

        {/* Share row — mobile */}
        <div className="flex gap-2">
          <button
            onClick={copyCode}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-black bg-white font-bold text-[13px] py-2.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <span className="material-symbols-outlined text-[17px]">{copied === "code" ? "check" : "content_copy"}</span>
            {copied === "code" ? "Copied!" : room.code}
          </button>
          <button
            onClick={shareInvite}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-black bg-[#f0a040] font-bold text-[13px] py-2.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <span className="material-symbols-outlined text-[17px]">{copied === "link" ? "check" : "share"}</span>
            {copied === "link" ? "Copied!" : "Invite"}
          </button>
        </div>

        {/* Players */}
        <div>
          <p className="font-black text-[12px] uppercase tracking-wider text-black/50 mb-2">
            Players ({players.length}) · {readyCount}/{players.length} ready
          </p>
          <PlayerGrid />
        </div>

        {/* Mobile chat — collapsible */}
        <MobileChatSection
          chatLog={chatLog}
          chatMsg={chatMsg}
          setChatMsg={setChatMsg}
          sendChat={sendChat}
        />
      </div>

      {/* Mobile bottom action bar
          NOTE: z-[100] + explicit safe-area padding so this always sits above
          any persistent app-level bottom tab bar, which was overlapping and
          blocking taps on Start/Ready/Leave. */}
      <div
        className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-[#f5f0e8] border-t-2 border-black px-4 pt-4 z-[100]"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <ActionButtons />
      </div>

      {/* ════════════ DESKTOP ════════════ */}
      <div className="hidden md:flex flex-1 overflow-hidden">

        {/* Center — room info + player grid + actions */}
        <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6">

          {/* Room info card */}
          <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] p-6 relative">
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
                <span className="font-mono font-black text-[18px] border-2 border-black px-3 py-1.5 bg-[#f5f0e8] tracking-widest shadow-[2px_2px_0px_0px_#000]">
                  {room.code}
                </span>
                <button
                  onClick={copyCode}
                  className="border-2 border-black p-2 bg-white shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  title="Copy code"
                >
                  <span className="material-symbols-outlined text-[18px]">{copied === "code" ? "check" : "content_copy"}</span>
                </button>
                <button
                  onClick={shareInvite}
                  className="border-2 border-black px-3 py-2 bg-[#f0a040] font-bold text-[12px] flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                  title="Share invite link"
                >
                  <span className="material-symbols-outlined text-[16px]">{copied === "link" ? "check" : "share"}</span>
                  {copied === "link" ? "Copied!" : "Invite"}
                </button>
              </div>
            </div>
            <p className="text-[12px] text-black/40 font-medium">{room.topic}</p>
          </div>

          {/* Players */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-[14px] uppercase tracking-wider">
                Players ({players.length}) · {readyCount}/{players.length} ready
              </h3>
              {room.mode === "live" && !isHost && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#E8534A] animate-pulse" />
                  <span className="text-[12px] font-bold text-black/50">Waiting for host to start...</span>
                </div>
              )}
            </div>
            <PlayerGrid />
          </div>

          {/* Action buttons */}
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
            <input
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type a message..."
              className="flex-1 border-2 border-black px-3 py-2 text-[13px] font-medium focus:outline-none bg-[#f5f0e8]"
            />
            <button
              onClick={sendChat}
              className="w-9 h-9 bg-black text-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#f0a040] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Mobile chat section (collapsible) ─────────────────────────────────────────
// Extracted so mobile gets real chat too — previously mobile had no chat UI at all.
function MobileChatSection({
  chatLog,
  chatMsg,
  setChatMsg,
  sendChat,
}: {
  chatLog: { name: string; text: string; isMe: boolean }[];
  chatMsg: string;
  setChatMsg: (v: string) => void;
  sendChat: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 border-b-2 border-black bg-[#f0a040]"
      >
        <span className="font-black text-[14px] text-black flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">forum</span>
          Room Chat
          {chatLog.length > 0 && (
            <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{chatLog.length}</span>
          )}
        </span>
        <span className="material-symbols-outlined text-[20px] text-black">{open ? "expand_less" : "expand_more"}</span>
      </button>
      {open && (
        <>
          <div className="max-h-48 overflow-y-auto p-3 flex flex-col gap-2">
            {chatLog.length === 0 && (
              <p className="text-[12px] text-black/30 font-bold text-center py-3">No messages yet.</p>
            )}
            {chatLog.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-0.5 ${msg.isMe ? "items-end" : "items-start"}`}>
                <span className="text-[10px] font-bold text-black/40">{msg.name}</span>
                <div className={`px-3 py-2 border-2 border-black text-[12px] font-medium max-w-[85%] ${msg.isMe ? "bg-black text-white" : "bg-[#f5f0e8] text-black"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-black p-3 flex gap-2">
            <input
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type a message..."
              className="flex-1 border-2 border-black px-3 py-2 text-[13px] font-medium focus:outline-none bg-[#f5f0e8]"
            />
            <button
              onClick={sendChat}
              className="w-9 h-9 bg-black text-white border-2 border-black flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
