import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface PresetAvatar {
  id: string;
  name: string;
  category: "character" | "emoji" | "custom";
  src: string; // Image path or emoji string
  isImage: boolean;
}

export interface PresetBanner {
  id: string;
  name: string;
  className: string;
  previewColor: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  // Illustrated Characters from public/buddies & public/fox
  { id: "fox_scholar", name: "Rex Scholar", category: "character", src: "/buddies/fox_scholar.png", isImage: true },
  { id: "owl_artist", name: "Athena Owl", category: "character", src: "/buddies/owl_artist.png", isImage: true },
  { id: "frog_scientist", name: "Newton Frog", category: "character", src: "/buddies/frog_scientist.png", isImage: true },
  { id: "koala_dev", name: "Ada Koala", category: "character", src: "/buddies/koala_developer.png", isImage: true },
  { id: "rabbit_doc", name: "Florence Bunny", category: "character", src: "/buddies/rabbit_doctor.png", isImage: true },
  { id: "wolf_astro", name: "Galileo Wolf", category: "character", src: "/buddies/wolf_astronaut.png", isImage: true },
  { id: "bear_mechanic", name: "Tesla Bear", category: "character", src: "/buddies/bear_mechanic.png", isImage: true },
  { id: "cat_chef", name: "Baking Cat", category: "character", src: "/buddies/cat_chef.png", isImage: true },
  { id: "fox_happy", name: "Excited Fox", category: "character", src: "/fox/fox-happy.png", isImage: true },
  { id: "fox_thinking", name: "Focus Fox", category: "character", src: "/fox/fox-thinking.png", isImage: true },
];

export const PRESET_BANNERS: PresetBanner[] = [
  {
    id: "amber_sunset",
    name: "Amber Sunset",
    className: "bg-gradient-to-r from-[#FFD13B] via-[#FF4D2E] to-[#FF8A00]",
    previewColor: "#FFD13B"
  },
  {
    id: "cyber_violet",
    name: "Cyber Violet",
    className: "bg-gradient-to-r from-[#18181B] via-[#4338CA] to-[#6366F1]",
    previewColor: "#4338CA"
  },
  {
    id: "emerald_focus",
    name: "Emerald Focus",
    className: "bg-gradient-to-r from-[#064E3B] via-[#059669] to-[#34D399]",
    previewColor: "#059669"
  },
  {
    id: "retro_grid",
    name: "Retro Paper Grid",
    className: "bg-[#FFFDF5] border-black bg-[radial-gradient(#1A1A1A_1.5px,transparent_1.5px)] [background-size:16px_16px]",
    previewColor: "#FFFDF5"
  },
  {
    id: "electric_crimson",
    name: "Electric Crimson",
    className: "bg-gradient-to-r from-[#831843] via-[#BE185D] to-[#F43F5E]",
    previewColor: "#BE185D"
  }
];

export interface StudentProfileData {
  displayName: string;
  username: string;
  bio: string;
  avatar: string; // Image URL or illustrated character path
  isAvatarImage: boolean;
  bannerId: string;
  customBannerUrl?: string;
  school: string;
  targetExam: string;
  targetSubject: string;
  verifiedStudent: boolean;
  notesCount?: number;
  totalLikes?: number;
  heartsCount?: number;
  hideHearts?: boolean; // Privacy toggle to hide social heart counters
}

import { formatFriendlyName, formatCleanHandle } from "@/lib/formatName";

const DEFAULT_PROFILE: StudentProfileData = {
  displayName: "Scholar",
  username: "@scholar",
  bio: "",
  avatar: "/buddies/fox_scholar.png",
  isAvatarImage: true,
  bannerId: "amber_sunset",
  school: "",
  targetExam: "",
  targetSubject: "",
  verifiedStudent: false,
  notesCount: 0,
  totalLikes: 0,
  heartsCount: 0,
  hideHearts: false
};

function getStorageKey(userId?: string) {
  return userId ? `studenius_student_profile_v2_${userId}` : "studenius_student_profile_v2";
}

export function getStoredUserProfile(userId?: string, fallbackName = "Scholar"): StudentProfileData {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawDisplay = parsed.displayName || fallbackName;
      const cleanDisplay = formatFriendlyName(rawDisplay);
      const cleanUser = formatCleanHandle(parsed.username, cleanDisplay);

      // Clean out fake default bio or fake default school if previously persisted
      const cleanBio = parsed.bio === "Prepping for upcoming exams with active recall summaries, flashcard drills, and high-yield study guides."
        ? ""
        : (parsed.bio || "");
      const cleanSchool = parsed.school === "Studenius Academy" ? "" : (parsed.school || "");

      const normalized: StudentProfileData = {
        ...DEFAULT_PROFILE,
        ...parsed,
        displayName: cleanDisplay,
        username: cleanUser,
        bio: cleanBio,
        school: cleanSchool,
        verifiedStudent: false // no self-verified badges
      };

      // If anything was migrated, persist back so it's clean permanently
      if (
        parsed.displayName !== cleanDisplay ||
        parsed.username !== cleanUser ||
        parsed.bio !== cleanBio ||
        parsed.school !== cleanSchool ||
        parsed.verifiedStudent === true
      ) {
        try {
          localStorage.setItem(getStorageKey(userId), JSON.stringify(normalized));
        } catch {}
      }

      return normalized;
    }
  } catch (e) {
    console.error("Error reading student profile from localStorage:", e);
  }

  const cleanDisplay = formatFriendlyName(fallbackName);
  const cleanUser = formatCleanHandle(null, cleanDisplay);

  return {
    ...DEFAULT_PROFILE,
    displayName: cleanDisplay,
    username: cleanUser
  };
}

export function saveStoredUserProfile(
  updates: Partial<StudentProfileData>,
  userId?: string
): StudentProfileData {
  const current = getStoredUserProfile(userId);
  const updated: StudentProfileData = { ...current, ...updates };

  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("studenius_profile_updated", { detail: updated }));
  } catch (e) {
    console.error("Error saving student profile to localStorage:", e);
  }

  // Background sync to Supabase if authenticated
  if (userId) {
    supabase
      .from("profiles")
      .update({
        display_name: updated.displayName,
        username: updated.username.replace("@", ""),
        avatar_url: updated.isAvatarImage ? updated.avatar : null,
      })
      .eq("id", userId)
      .then(() => {})
      .catch((err) => console.warn("Supabase profile sync skipped:", err));
  }

  return updated;
}

export function useUserProfile(userId?: string, initialFallbackName = "Student") {
  const [profile, setProfile] = useState<StudentProfileData>(() =>
    getStoredUserProfile(userId, initialFallbackName)
  );

  useEffect(() => {
    setProfile(getStoredUserProfile(userId, initialFallbackName));

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setProfile(e.detail);
      } else {
        setProfile(getStoredUserProfile(userId, initialFallbackName));
      }
    };

    window.addEventListener("studenius_profile_updated", handleUpdate);
    return () => window.removeEventListener("studenius_profile_updated", handleUpdate);
  }, [userId, initialFallbackName]);

  const updateProfile = useCallback(
    (updates: Partial<StudentProfileData>) => {
      const saved = saveStoredUserProfile(updates, userId);
      setProfile(saved);
      return saved;
    },
    [userId]
  );

  return { profile, updateProfile };
}

export function hasGivenHeart(targetUserId: string, currentUserId?: string): boolean {
  if (!targetUserId || !currentUserId || targetUserId === currentUserId) return false;
  try {
    const raw = localStorage.getItem(`pz_given_hearts_${currentUserId}`) || "[]";
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.includes(targetUserId);
  } catch {
    return false;
  }
}

export async function toggleHeartOnProfile(
  targetUserId: string,
  targetInitialHearts: number,
  currentUserId?: string
): Promise<{ hearted: boolean; newCount: number }> {
  if (!targetUserId || !currentUserId || targetUserId === currentUserId) {
    return { hearted: false, newCount: targetInitialHearts };
  }

  const storageKey = `pz_given_hearts_${currentUserId}`;
  let givenList: string[] = [];
  try {
    const raw = localStorage.getItem(storageKey) || "[]";
    givenList = JSON.parse(raw);
    if (!Array.isArray(givenList)) givenList = [];
  } catch {}

  const alreadyHearted = givenList.includes(targetUserId);
  const willHeart = !alreadyHearted;

  if (willHeart) {
    givenList.push(targetUserId);
  } else {
    givenList = givenList.filter((id) => id !== targetUserId);
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(givenList));
  } catch {}

  const newCount = willHeart ? targetInitialHearts + 1 : Math.max(0, targetInitialHearts - 1);

  // Sync with Supabase if online
  if (currentUserId && targetUserId) {
    try {
      if (willHeart) {
        await supabase
          .from("profile_hearts")
          .insert({ giver_id: currentUserId, receiver_id: targetUserId });
      } else {
        await supabase
          .from("profile_hearts")
          .delete()
          .eq("giver_id", currentUserId)
          .eq("receiver_id", targetUserId);
      }
    } catch {}
  }

  return { hearted: willHeart, newCount };
}
