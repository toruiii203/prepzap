import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playTap, playSuccess } from "@/lib/soundFX";

export interface StudyPeer {
  userId: string;
  name: string;
  avatar: string;
  code: string;
  subject: string;
  status: "Locking In" | "Deep Work" | "Short Break" | "Reviewing Cards";
  startedAt: number;
  isSelf?: boolean;
}

interface PresenceStateItem {
  user_id: string;
  name: string;
  avatar: string;
  code: string;
  subject: string;
  status: "Locking In" | "Deep Work" | "Short Break" | "Reviewing Cards";
  started_at: number;
}

export function useCoStudyPresence() {
  const { user, profile } = useAuth();
  const [activePeers, setActivePeers] = useState<StudyPeer[]>([]);
  const [currentSubject, setCurrentSubject] = useState("General Study");
  const [currentStatus, setCurrentStatus] = useState<StudyPeer["status"]>("Deep Work");
  const [isBroadcasting, setIsBroadcasting] = useState(true);
  const channelRef = useRef<any>(null);

  const myCode = user?.id ? `REX-${user.id.replace(/-/g, "").slice(0, 4).toUpperCase()}` : "REX-YOU";
  const myName = profile?.full_name || (user as any)?.user_metadata?.full_name || profile?.username || user?.email?.split("@")[0] || "You";
  const myAvatar = profile?.avatar_url || "🎓";

  useEffect(() => {
    const channelName = "community-study-lounge";
    const presenceKey = user?.id || `guest-${myCode}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: presenceKey } }
    });

    channelRef.current = channel;

    const syncPeers = () => {
      const state = channel.presenceState<PresenceStateItem>();
      const peersList: StudyPeer[] = [];

      Object.entries(state).forEach(([key, items]) => {
        if (Array.isArray(items) && items.length > 0) {
          const item = items[0];
          const isMe = user?.id ? item.user_id === user.id : key === presenceKey;
          peersList.push({
            userId: item.user_id || key,
            name: item.name || "Student",
            avatar: item.avatar || "🎓",
            code: item.code || "REX-CAMPUS",
            subject: item.subject || "Study Session",
            status: item.status || "Deep Work",
            startedAt: item.started_at || Date.now(),
            isSelf: isMe
          });
        }
      });

      setActivePeers(peersList);
    };

    channel
      .on("presence", { event: "sync" }, syncPeers)
      .on("presence", { event: "join" }, syncPeers)
      .on("presence", { event: "leave" }, syncPeers);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && isBroadcasting) {
        try {
          await channel.track({
            user_id: user?.id || `guest-${myCode}`,
            name: myName,
            avatar: myAvatar,
            code: myCode,
            subject: currentSubject,
            status: currentStatus,
            started_at: Date.now()
          });
        } catch (err) {
          console.warn("Could not track lounge presence:", err);
        }
      }
    });

    return () => {
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
      } catch (err) {
        console.warn("Error removing lounge presence channel:", err);
      }
    };
  }, [user?.id, myCode, myName, myAvatar, isBroadcasting]);

  const updateFocusStatus = useCallback(async (newStatus: StudyPeer["status"], newSubject?: string) => {
    playTap();
    setCurrentStatus(newStatus);
    const sub = newSubject || currentSubject;
    if (newSubject) setCurrentSubject(newSubject);

    if (channelRef.current && isBroadcasting) {
      try {
        await channelRef.current.track({
          user_id: user?.id || `guest-${myCode}`,
          name: myName,
          avatar: myAvatar,
          code: myCode,
          subject: sub,
          status: newStatus,
          started_at: Date.now()
        });
        toast.success(`Focus status set to: ${newStatus}`, {
          description: `Studying ${sub}`
        });
      } catch (e) {
        console.warn("Failed updating lounge presence track:", e);
      }
    }
  }, [channelRef, isBroadcasting, user?.id, myCode, myName, myAvatar, currentSubject]);

  const toggleBroadcasting = useCallback(async () => {
    playTap();
    if (isBroadcasting) {
      setIsBroadcasting(false);
      if (channelRef.current) {
        await channelRef.current.untrack();
      }
      toast.info("Study presence paused (Ghost Mode)");
    } else {
      setIsBroadcasting(true);
      if (channelRef.current) {
        await channelRef.current.track({
          user_id: user?.id || `guest-${myCode}`,
          name: myName,
          avatar: myAvatar,
          code: myCode,
          subject: currentSubject,
          status: currentStatus,
          started_at: Date.now()
        });
      }
      toast.success("Study presence visible in Lounge! 🟢");
    }
  }, [isBroadcasting, channelRef, user?.id, myCode, myName, myAvatar, currentSubject, currentStatus]);

  return {
    activePeers,
    currentSubject,
    setCurrentSubject,
    currentStatus,
    updateFocusStatus,
    isBroadcasting,
    toggleBroadcasting,
    myCode
  };
}
