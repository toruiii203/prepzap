import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { playTap, playSuccess, playMastery } from "@/lib/soundFX";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { loadLibrary, saveLibrary } from "@/lib/sourceContext";
import { withTimeout } from "@/lib/withTimeout";

export interface CampusNote {
  id: string;
  user_id?: string;
  title: string;
  subject: string;
  subjectBadgeColor: string;
  author: string;
  authorCode?: string;
  authorAvatar: string;
  date: string;
  readTime: string;
  likes: number;
  likedByUser?: boolean;
  downloads?: number;
  isOfficialSeed?: boolean;
  isReported?: boolean;
  isAiGenerated?: boolean;
  helpfulCount?: number;
  verifiedCount?: number;
  reportCount?: number;
  difficulty?: string;
  sourceHash?: string;
  status?: "published" | "hidden" | "flagged";
  tags: string[];
  summary: string;
  content: string;
  attachmentUrl?: string;
}

export interface StudyBuddy {
  id: string;
  name: string;
  username?: string;
  code: string;
  avatar: string;
  subject: string;
  streakDays: number;
  hasStudiedToday: boolean;
  lastActive: string;
  lastNudgedAt?: number;
  bio?: string;
  level?: number;
  totalXp?: number;
  notesCount?: number;
  likesCount?: number;
  school?: string;
}

const STORAGE_NOTES_KEY = "studenius_campus_notes_v3";
const STORAGE_BUDDIES_KEY = "studenius_study_buddies_v3";

export const SUBJECT_BADGE_COLORS: Record<string, string> = {
  Biology: "bg-white text-black border-2 border-black font-black",
  Calculus: "bg-white text-black border-2 border-black font-black",
  Chemistry: "bg-white text-black border-2 border-black font-black",
  History: "bg-white text-black border-2 border-black font-black",
  Psychology: "bg-white text-black border-2 border-black font-black",
  "Computer Science": "bg-white text-black border-2 border-black font-black",
  Physics: "bg-white text-black border-2 border-black font-black",
  Economics: "bg-white text-black border-2 border-black font-black",
  Medicine: "bg-white text-black border-2 border-black font-black",
  General: "bg-white text-black border-2 border-black font-black"
};

export function useCommunity(options?: { loadNotes?: boolean }) {
  const { user, profile } = useAuth();
  const userStorageKey = user?.id ? `${STORAGE_BUDDIES_KEY}_${user.id}` : STORAGE_BUDDIES_KEY;

  const [notes, setNotes] = useState<CampusNote[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_NOTES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((n: any) => !n.isOfficialSeed);
        }
      }
    } catch {}
    return [];
  });

  const [buddies, setBuddies] = useState<StudyBuddy[]>(() => {
    try {
      const key = user?.id ? `${STORAGE_BUDDIES_KEY}_${user.id}` : STORAGE_BUDDIES_KEY;
      const stored = localStorage.getItem(key) || localStorage.getItem(STORAGE_BUDDIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((b: any) => ({
            ...b,
            bio: (b.bio && !b.bio.includes("linked on Studenius") && !b.bio.includes("Active study partner")) ? b.bio : "",
            school: (b.school && b.school !== "Studenius Scholar") ? b.school : ""
          }));
        }
      }
    } catch {}
    return [];
  });

  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // ── Sync Notes from Supabase (Only when loadNotes option is true) ────────────
  useEffect(() => {
    if (!options?.loadNotes) return;
    let isSubscribed = true;

    // Hard fallback timer: guarantees loading state clears within 4s under any network condition
    const safetyTimer = setTimeout(() => {
      if (isSubscribed) setIsLoadingNotes(false);
    }, 4000);

    async function loadCloudNotes() {
      setIsLoadingNotes(true);
      try {
        const query = supabase
          .from("community_vault_notes")
          .select("*")
          .order("created_at", { ascending: false });

        const { data, error } = await withTimeout(query, 3500, "community_vault_notes");

        if (!error && Array.isArray(data) && isSubscribed) {
          const cloudNotes: CampusNote[] = data.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            title: row.title,
            subject: row.subject,
            subjectBadgeColor: "bg-white text-black border-2 border-black font-black",
            author: row.author_name,
            authorCode: row.author_code,
            authorAvatar: row.author_avatar || "/buddies/fox_scholar.png",
            date: new Date(row.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            readTime: row.read_time || "5 min read",
            likes: row.likes_count ?? 0,
            downloads: row.downloads_count ?? 0,
            likedByUser: false,
            isOfficialSeed: row.is_official_seed ?? false,
            isReported: row.is_reported ?? false,
            tags: Array.isArray(row.tags) ? row.tags : [],
            summary: row.summary || "",
            content: row.content,
            attachmentUrl: row.attachment_url || undefined
          }));

          setNotes((prev) => {
            const cloudIds = new Set(cloudNotes.map((c) => c.id));
            const userLocalNotes = prev.filter((p) => !p.isOfficialSeed && !cloudIds.has(p.id));
            const combined = [...cloudNotes, ...userLocalNotes];
            try {
              localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(combined));
            } catch {}
            return combined;
          });
        }
      } catch (err) {
        // Table not ready, timed out, or offline: keeps local cache
        console.warn("[useCommunity] loadCloudNotes error or timeout:", err);
      } finally {
        clearTimeout(safetyTimer);
        if (isSubscribed) setIsLoadingNotes(false);
      }
    }

    loadCloudNotes();

    return () => {
      isSubscribed = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  // ── Sync Buddies from Supabase study_partners ──────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    try {
      const stored = localStorage.getItem(userStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setBuddies(parsed);
      }
    } catch {}

    let isSubscribed = true;

    async function loadCloudPartners() {
      try {
        const query = supabase
          .from("study_partners")
          .select("*")
          .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`);

        const { data: cloudPartners, error } = await withTimeout(query, 3500, "study_partners");

        if (!error && Array.isArray(cloudPartners) && isSubscribed) {
          setBuddies((prev) => {
            const map = new Map<string, StudyBuddy>();
            prev.forEach((b) => map.set(b.code, b));

            cloudPartners.forEach((cp: any) => {
              const isMeSender = cp.user_id === user.id;
              const partnerCode = isMeSender
                ? cp.partner_code
                : (cp.user_code || `REX-${cp.user_id.replace(/-/g, "").slice(0, 4).toUpperCase()}`);
              const partnerName = isMeSender
                ? cp.partner_name
                : (cp.user_name || "Study Partner");

              if (!map.has(partnerCode)) {
                map.set(partnerCode, {
                  id: `buddy-cloud-${cp.id}`,
                  name: partnerName,
                  username: `@${partnerName.toLowerCase().replace(/[\s,]+/g, "_")}`,
                  code: partnerCode,
                  avatar: "/buddies/fox_scholar.png",
                  subject: "Study Partner",
                  streakDays: 1,
                  hasStudiedToday: false,
                  lastActive: "Active recently",
                  bio: "",
                  school: "",
                  level: 1,
                  totalXp: 0,
                  notesCount: 0,
                  likesCount: 0,
                });
              }
            });

            const merged = Array.from(map.values());
            try {
              localStorage.setItem(userStorageKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch {}
    }

    loadCloudPartners();

    return () => {
      isSubscribed = false;
    };
  }, [user?.id, userStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
    } catch {}
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(buddies));
    } catch {}
  }, [buddies, userStorageKey]);

  const toggleLikeNote = useCallback(async (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          const liked = !n.likedByUser;
          const newLikes = liked ? n.likes + 1 : Math.max(0, n.likes - 1);

          // Update Supabase in background if valid UUID
          if (!n.id.startsWith("guide-") && !n.id.startsWith("user-note-")) {
            supabase
              .from("community_vault_notes")
              .update({ likes_count: newLikes })
              .eq("id", noteId)
              .then();
          }

          return {
            ...n,
            likedByUser: liked,
            likes: newLikes
          };
        }
        return n;
      })
    );
  }, []);

  const sendNudge = useCallback((buddyId: string) => {
    const buddy = buddies.find((b) => b.id === buddyId);
    if (!buddy) return;

    const now = Date.now();
    if (buddy.lastNudgedAt && now - buddy.lastNudgedAt < 5 * 60 * 1000) {
      toast.info(`You already nudged ${buddy.name}! Give them a bit of time.`);
      return;
    }

    playTap();

    setBuddies((prev) =>
      prev.map((b) => (b.id === buddyId ? { ...b, lastNudgedAt: now } : b))
    );

    toast.success(`Sent a friendly streak reminder to ${buddy.name}! 🔥`);
  }, [buddies]);

  const reportNote = useCallback((noteId: string, reason: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          const reportCount = (n.reportCount || 0) + 1;
          const isReported = reportCount >= 3 || n.isReported === true;
          return { ...n, isReported, reportCount };
        }
        return n;
      })
    );
    try {
      const reports = JSON.parse(localStorage.getItem("studenius_reported_notes") || "[]");
      reports.push({ noteId, reason, timestamp: Date.now() });
      localStorage.setItem("studenius_reported_notes", JSON.stringify(reports));

      if (!noteId.startsWith("guide-") && !noteId.startsWith("user-note-")) {
        supabase
          .from("community_vault_notes")
          .update({ is_reported: true })
          .eq("id", noteId)
          .then();
      }
    } catch {}
    toast.success("Note reported. Our moderation system will review it.");
  }, []);

  const voteHelpful = useCallback((noteId: string) => {
    playTap();
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          const helpfulCount = (n.helpfulCount || 0) + 1;
          return { ...n, helpfulCount };
        }
        return n;
      })
    );
    toast.success("Marked as helpful! Thank you for validating community notes.");
  }, []);

  const verifyNote = useCallback((noteId: string) => {
    playTap();
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          const verifiedCount = (n.verifiedCount || 0) + 1;
          return { ...n, verifiedCount };
        }
        return n;
      })
    );
    toast.success("Verified as accurate study material! 🎯");
  }, []);

  const publishNote = useCallback(async (newNote: Omit<CampusNote, "id" | "date" | "likes" | "likedByUser"> & { attachmentUrl?: string }) => {
    // Moderation checks
    if (!newNote.title.trim() || newNote.title.trim().length < 4) {
      toast.error("Please enter a clear title (at least 4 characters).");
      return false;
    }

    if (!newNote.content.trim() || newNote.content.trim().length < 30) {
      toast.error("Study notes must contain at least 30 characters of academic material.");
      return false;
    }

    const bannedKeywords = ["cheat in exam", "hack", "leak exam", "porn", "xxx", "buy essay"];
    const hasBanned = bannedKeywords.some((b) => 
      newNote.title.toLowerCase().includes(b) || newNote.content.toLowerCase().includes(b)
    );
    if (hasBanned) {
      toast.error("Content flagged by moderation filter.", {
        description: "Please ensure your study guide adheres to academic guidelines."
      });
      return false;
    }

    const myCode = user?.id ? `REX-${user.id.replace(/-/g, "").slice(0, 4).toUpperCase()}` : "";

    const noteToAdd: CampusNote = {
      ...newNote,
      id: `user-note-${Date.now()}`,
      authorCode: myCode,
      date: "Just now",
      likes: 1,
      downloads: 0,
      likedByUser: true,
      isOfficialSeed: false,
      isReported: false
    };

    // Optimistic UI update
    setNotes((prev) => [noteToAdd, ...prev]);
    playSuccess();
    toast.success("Study guide published to Campus Vault!", {
      description: "Classmates can now study your guide with quizzes and flashcards."
    });

    // Write to Supabase community_vault_notes
    try {
      const { data, error } = await supabase.from("community_vault_notes").insert({
        user_id: user?.id || null,
        author_name: noteToAdd.author,
        author_avatar: noteToAdd.authorAvatar,
        author_code: myCode,
        title: noteToAdd.title,
        subject: noteToAdd.subject,
        subject_badge_color: noteToAdd.subjectBadgeColor,
        tags: noteToAdd.tags,
        summary: noteToAdd.summary,
        content: noteToAdd.content,
        read_time: noteToAdd.readTime,
        likes_count: 1,
        downloads_count: 0,
        attachment_url: newNote.attachmentUrl || null
      }).select("id").single();

      if (data?.id) {
        setNotes((prev) =>
          prev.map((n) => (n.id === noteToAdd.id ? { ...n, id: data.id } : n))
        );
      }
    } catch (err) {
      console.warn("Failed saving note to Supabase vault:", err);
    }

    return true;
  }, [user]);

  // ── 1-Click "Clone to My Notes" & Source Library ──────────────────────────
  const cloneNoteToWorkspace = useCallback(async (note: CampusNote) => {
    playSuccess();

    // 1. Save to user's personal notes in Supabase if logged in
    if (user?.id) {
      try {
        const formattedHtml = `<h2><strong>${note.title}</strong></h2><p><em>Author: ${note.author} &bull; Subject: ${note.subject}</em></p><hr/>${note.content.replace(/\n\n/g, '<p></p>').replace(/\n/g, '<br/>')}`;
        
        await supabase.from("notes").insert({
          user_id: user.id,
          title: `${note.title} (Vault Copy)`,
          content: formattedHtml
        });

        // Update local notes workspace cache
        const cacheKey = `studenius_notes_cache_${user.id}`;
        const existingRaw = localStorage.getItem(cacheKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        existing.unshift({
          id: `note-cloned-${Date.now()}`,
          user_id: user.id,
          title: `${note.title} (Vault Copy)`,
          content: formattedHtml,
          updated_at: new Date().toISOString()
        });
        localStorage.setItem(cacheKey, JSON.stringify(existing));
      } catch (e) {
        console.warn("Could not save to Supabase notes:", e);
      }
    }

    // 2. Add to SourceLibrary so it's active across Practice, Flashcards, AI Tutor
    try {
      const library = loadLibrary();
      const alreadyInLib = library.some((f) => f.name === note.title);
      if (!alreadyInLib) {
        const newSourceDoc = {
          id: `vault-source-${Date.now()}`,
          name: note.title,
          size: note.content.length,
          type: "text/markdown",
          uploadedAt: new Date().toISOString(),
          preview: note.summary || note.content.slice(0, 300),
          fullText: note.content,
          tags: [note.subject, ...(note.tags || [])],
          mastery: "yellow" as const
        };
        saveLibrary([newSourceDoc, ...library]);
      }
    } catch (e) {
      console.warn("Could not add to SourceLibrary:", e);
    }

    // 3. Increment downloads count on note in DB
    try {
      if (!note.id.startsWith("guide-") && !note.id.startsWith("user-note-")) {
        await supabase
          .from("community_vault_notes")
          .update({ downloads_count: (note.downloads || 0) + 1 })
          .eq("id", note.id);
      }
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, downloads: (n.downloads || 0) + 1 } : n))
      );
    } catch {}

    toast.success(`"${note.title}" cloned to your Workspace!`, {
      description: "Added to your Notes and Source Library for instant studying."
    });
    return true;
  }, [user?.id]);

  // ── Authentic Classmate Lookup (Zero Fake AI Stand-ins) ───────────────────
  const addFriendByCode = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      toast.error("Please enter a valid Friend Code (e.g., REX-69E6)");
      return false;
    }

    const myCode = user?.id ? `REX-${user.id.replace(/-/g, "").slice(0, 4).toUpperCase()}` : "";
    if (myCode && clean === myCode) {
      toast.info("That's your own Friend Code!", {
        description: "Share this code with your classmate or enter their code to link together."
      });
      return false;
    }

    const existing = buddies.find((b) => b.code === clean);
    if (existing) {
      toast.info(`${existing.name} is already in your study circle!`);
      return false;
    }

    let matchedUserId: string | null = null;
    let resolvedName = "";
    let resolvedUsername = "";
    let resolvedAvatar = "/buddies/fox_scholar.png";
    let resolvedStreak = 1;
    let resolvedXp = 0;
    let resolvedSchool = "";
    let resolvedBio = "";

    try {
      const rawHash = clean.replace("REX-", "").toLowerCase();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, username, total_xp, streak_days, avatar_url, school, bio");

      if (data && data.length > 0) {
        const match = data.find((p: any) => {
          const pHash = p.id.replace(/-/g, "").slice(0, 4).toLowerCase();
          return pHash === rawHash || 
                 (p.username && p.username.toLowerCase() === rawHash) ||
                 (p.username && `@${p.username.toLowerCase()}` === clean.toLowerCase());
        });

        if (match) {
          matchedUserId = match.id;
          resolvedName = match.display_name || match.full_name || (match.username ? `@${match.username}` : "Classmate");
          resolvedUsername = match.username ? `@${match.username}` : `@student_${rawHash}`;
          resolvedAvatar = match.avatar_url || "/buddies/fox_scholar.png";
          resolvedStreak = match.streak_days || 1;
          resolvedXp = match.total_xp || 0;
          resolvedSchool = match.school || "";
          resolvedBio = match.bio || "";
        }
      }
    } catch (e) {
      console.warn("Could not query profiles for friend code:", e);
    }

    // AUTHENTIC CHECK: If no real account matches this code, honestly tell the user!
    // No more fake generated bots like "Alex Rivera" or "Sophia Chen"
    if (!resolvedName || !matchedUserId) {
      toast.error(`No student found with Friend Code "${clean}"`, {
        description: "Please check the code with your classmate and make sure they have signed up."
      });
      return false;
    }

    // Save mutual friendship to Supabase study_partners table
    if (user?.id && matchedUserId) {
      try {
        const myName = profile?.full_name || (user as any)?.user_metadata?.full_name || user.email?.split("@")[0] || "Study Partner";
        await supabase.from("study_partners").upsert({
          user_id: user.id,
          partner_id: matchedUserId,
          partner_code: clean,
          partner_name: resolvedName,
          user_code: myCode,
          user_name: myName
        }, { onConflict: "user_id,partner_id" });
      } catch (err) {
        console.warn("Supabase study_partners sync error:", err);
      }
    }

    const newBuddy: StudyBuddy = {
      id: `buddy-${Date.now()}`,
      name: resolvedName,
      username: resolvedUsername,
      code: clean,
      avatar: resolvedAvatar,
      subject: "Study Partner",
      streakDays: resolvedStreak,
      hasStudiedToday: false,
      lastActive: "Active today",
      bio: resolvedBio,
      school: resolvedSchool,
      level: Math.floor(resolvedXp / 500) + 1,
      totalXp: resolvedXp,
      notesCount: 0,
      likesCount: 0
    };

    setBuddies((prev) => {
      const updated = [...prev, newBuddy];
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    playMastery();
    toast.success(`Connected with ${newBuddy.name}! 🔥`, {
      description: `Streak linked with ${newBuddy.code}.`
    });
    return true;
  }, [buddies, user, profile, userStorageKey]);

  const removeFriend = useCallback(async (buddyId: string) => {
    const target = buddies.find((b) => b.id === buddyId);
    if (!target) return;

    setBuddies((prev) => {
      const updated = prev.filter((b) => b.id !== buddyId);
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (user?.id) {
      try {
        await supabase
          .from("study_partners")
          .delete()
          .or(`and(user_id.eq.${user.id},partner_code.eq.${target.code}),and(partner_id.eq.${user.id},user_code.eq.${target.code})`);
      } catch (e) {
        console.warn("Could not delete partner from Supabase:", e);
      }
    }
  }, [buddies, userStorageKey, user?.id]);

  const blockFriend = useCallback(async (buddyId: string) => {
    const target = buddies.find((b) => b.id === buddyId);
    if (!target) return;

    setBuddies((prev) => {
      const updated = prev.filter((b) => b.id !== buddyId);
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const blockedKey = `studenius_blocked_${user?.id || "guest"}`;
      const blockedRaw = localStorage.getItem(blockedKey) || "[]";
      const blocked = JSON.parse(blockedRaw);
      if (!blocked.includes(target.code)) {
        blocked.push(target.code);
        localStorage.setItem(blockedKey, JSON.stringify(blocked));
      }
    } catch {}

    if (user?.id) {
      try {
        await supabase
          .from("study_partners")
          .update({ status: "blocked" })
          .or(`and(user_id.eq.${user.id},partner_code.eq.${target.code}),and(partner_id.eq.${user.id},user_code.eq.${target.code})`);
      } catch (e) {
        console.warn("Could not block partner in Supabase:", e);
      }
    }

    toast.info(`Blocked ${target.name}. They will not see your study activity.`);
  }, [buddies, userStorageKey, user?.id]);

  return {
    notes,
    buddies,
    isLoadingNotes,
    toggleLikeNote,
    sendNudge,
    publishNote,
    cloneNoteToWorkspace,
    addFriendByCode,
    removeFriend,
    blockFriend,
    reportNote,
    voteHelpful,
    verifyNote
  };
}
