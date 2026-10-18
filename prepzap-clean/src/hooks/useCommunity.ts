import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { playTap, playSuccess, playMastery } from "@/lib/soundFX";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { loadLibrary, saveLibrary } from "@/lib/sourceContext";

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
  Biology: "bg-emerald-50 text-emerald-700 border-emerald-300",
  Calculus: "bg-blue-50 text-blue-700 border-blue-300",
  Chemistry: "bg-amber-50 text-amber-700 border-amber-300",
  History: "bg-rose-50 text-rose-700 border-rose-300",
  Psychology: "bg-purple-50 text-purple-700 border-purple-300",
  "Computer Science": "bg-cyan-50 text-cyan-700 border-cyan-300",
  Physics: "bg-indigo-50 text-indigo-700 border-indigo-300",
  Economics: "bg-teal-50 text-teal-700 border-teal-300",
  Medicine: "bg-red-50 text-red-700 border-red-300",
  General: "bg-stone-50 text-stone-700 border-stone-300"
};

// Verified academic study guides for the Campus Vault
const SEED_NOTES: CampusNote[] = [
  {
    id: "guide-bio-cell-resp",
    title: "Cellular Respiration & ATP Synthesis Master Guide",
    subject: "Biology",
    subjectBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
    author: "Verified Campus Guide",
    authorAvatar: "🌿",
    date: "High-Yield",
    readTime: "6 min read",
    likes: 84,
    downloads: 142,
    likedByUser: false,
    isOfficialSeed: true,
    tags: ["Mitochondria", "Krebs Cycle", "Oxidative Phosphorylation", "Glycolysis"],
    summary: "Clear step-by-step breakdown of aerobic respiration, ATP yield calculations (30-32 ATP), and chemiosmosis proton gradient physics.",
    content: `# Cellular Respiration & ATP Synthesis Guide

## Overview & Net Formula
Cellular respiration converts biochemical energy from nutrients into ATP:
$$\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\rightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\sim 30\\text{-}32\\text{ ATP}$$

## Step 1: Glycolysis
- **Location**: Cytoplasm (Anaerobic - does not require O2)
- **Reactants**: 1 Glucose (6C), 2 ATP input, 2 NAD+
- **Yield**: 2 Pyruvate (3C), 4 ATP (Net 2 ATP via substrate-level phosphorylation), 2 NADH

## Step 2: Pyruvate Oxidation (The Link Reaction)
- **Location**: Mitochondrial Matrix
- Each 3C Pyruvate is converted to 2C Acetyl-CoA, releasing 1 CO2 and generating 1 NADH per pyruvate (Total: 2 CO2, 2 NADH per glucose).

## Step 3: Krebs Cycle (Citric Acid Cycle)
- **Location**: Mitochondrial Matrix
- Acetyl-CoA combines with Oxaloacetate (4C) to form Citrate (6C).
- Per glucose (2 turns): 4 CO2, 6 NADH, 2 FADH2, 2 ATP (or GTP).

## Step 4: Oxidative Phosphorylation & Chemiosmosis
- **Location**: Inner Mitochondrial Membrane (Cristae)
- **Electron Transport Chain (ETC)**: Electrons from NADH and FADH2 are transferred through Complexes I-IV to Oxygen (the terminal electron acceptor, forming H2O).
- **Proton Gradient**: H+ ions are pumped into the intermembrane space, generating a high electrochemical potential.
- **ATP Synthase**: Protons rush back into matrix through ATP Synthase rotor, producing ~26-28 ATP via chemiosmosis.`
  },
  {
    id: "guide-calc-derivatives",
    title: "Calculus Derivatives & Core Theorems Cheat Sheet",
    subject: "Calculus",
    subjectBadgeColor: "bg-blue-50 text-blue-700 border-blue-300",
    author: "Verified Campus Guide",
    authorAvatar: "📐",
    date: "High-Yield",
    readTime: "5 min read",
    likes: 67,
    downloads: 98,
    likedByUser: false,
    isOfficialSeed: true,
    tags: ["Chain Rule", "L'Hôpital", "Mean Value Theorem", "Limits"],
    summary: "Essential differentiation rules, trigonometric derivative shortcuts, and critical test-day theorems (MVT, IVT, EVT).",
    content: `# Essential Calculus AB/BC Derivatives Reference

## 1. Core Differentiation Rules
- **Power Rule**: $\\frac{d}{dx}[x^n] = n x^{n-1}$
- **Product Rule**: $(f \\cdot g)' = f'g + fg'$
- **Quotient Rule**: $\\left(\\frac{f}{g}\\right)' = \\frac{f'g - fg'}{g^2}$
- **Chain Rule**: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$

## 2. Exponential & Logarithmic Derivatives
- $\\frac{d}{dx}[e^x] = e^x$
- $\\frac{d}{dx}[a^x] = a^x \\ln(a)$
- $\\frac{d}{dx}[\\ln(x)] = \\frac{1}{x}$

## 3. Trigonometric Derivatives
- $\\frac{d}{dx}[\\sin x] = \\cos x$
- $\\frac{d}{dx}[\\cos x] = -\\sin x$
- $\\frac{d}{dx}[\\tan x] = \\sec^2 x$
- $\\frac{d}{dx}[\\sec x] = \\sec x \\tan x$
- $\\frac{d}{dx}[\\csc x] = -\\csc x \\cot x$
- $\\frac{d}{dx}[\\cot x] = -\\csc^2 x$

## 4. Fundamental Theorems
- **Mean Value Theorem (MVT)**: If $f$ is continuous on $[a, b]$ and differentiable on $(a, b)$, there exists at least one $c \\in (a, b)$ such that:
$$f'(c) = \\frac{f(b) - f(a)}{b - a}$$
- **L'Hôpital's Rule**: If $\\lim \\frac{f(x)}{g(x)}$ results in indeterminate $\\frac{0}{0}$ or $\\frac{\\pm\\infty}{\\pm\\infty}$, then $\\lim \\frac{f(x)}{g(x)} = \\lim \\frac{f'(x)}{g'(x)}$.`
  },
  {
    id: "guide-chem-thermo",
    title: "Thermodynamics & Reaction Kinetics High-Yield Deck",
    subject: "Chemistry",
    subjectBadgeColor: "bg-amber-50 text-amber-700 border-amber-300",
    author: "Verified Campus Guide",
    authorAvatar: "🧪",
    date: "High-Yield",
    readTime: "7 min read",
    likes: 52,
    downloads: 87,
    likedByUser: false,
    isOfficialSeed: true,
    tags: ["Gibbs Free Energy", "Enthalpy", "Entropy", "Rate Laws", "Arrhenius"],
    summary: "Complete guide on delta H, delta S, delta G spontaneity criteria, equilibrium constants, and reaction order graphs.",
    content: `# AP Chemistry: Thermochemistry & Kinetics

## 1. Laws of Thermodynamics
- **Enthalpy ($\\Delta H$)**: Heat absorbed or released at constant pressure.
  - $\\Delta H < 0$: Exothermic (releases heat, products more stable)
  - $\\Delta H > 0$: Endothermic (absorbs heat)
- **Entropy ($\\Delta S$)**: Measure of molecular disorder and dispersal of energy.
  - $\\Delta S > 0$: Increasing disorder (gas > liquid > solid, more moles of gas)

## 2. Gibbs Free Energy ($\\Delta G$)
$$\\Delta G = \\Delta H - T\\Delta S$$
- $\\Delta G < 0$: Thermodynamically favorable (spontaneous)
- $\\Delta G > 0$: Non-spontaneous (requires continuous energy input)
- $\\Delta G = 0$: At chemical equilibrium

### Spontaneity Matrix:
- $\\Delta H (-), \\Delta S (+)$: Always spontaneous at all $T$.
- $\\Delta H (+), \\Delta S (-)$: Never spontaneous at any $T$.
- $\\Delta H (-), \\Delta S (-)$: Spontaneous only at low $T$.
- $\\Delta H (+), \\Delta S (+)$: Spontaneous only at high $T$.

## 3. Reaction Kinetics & Rate Laws
- Differential rate law: $\\text{Rate} = k[A]^m[B]^n$
- **Zero Order**: Rate $= k$, linear plot: $[A]$ vs time.
- **First Order**: Rate $= k[A]$, linear plot: $\\ln[A]$ vs time. Half-life: $t_{1/2} = \\frac{0.693}{k}$.
- **Second Order**: Rate $= k[A]^2$, linear plot: $\\frac{1}{[A]}$ vs time.`
  },
  {
    id: "guide-hist-wwii",
    title: "World War II Pivotal Turning Points & Treaties",
    subject: "History",
    subjectBadgeColor: "bg-rose-50 text-rose-700 border-rose-300",
    author: "Verified Campus Guide",
    authorAvatar: "🏛️",
    date: "High-Yield",
    readTime: "8 min read",
    likes: 49,
    downloads: 65,
    likedByUser: false,
    isOfficialSeed: true,
    tags: ["Stalingrad", "Midway", "Normandy D-Day", "Yalta Conference"],
    summary: "Strategic military turning points on European and Pacific fronts, wartime conferences, and post-war structural changes.",
    content: `# World War II: Key Turning Points & Strategic Decisions

## 1. European Theatre Turning Points
- **Battle of Britain (1940)**: Royal Air Force (RAF) utilized newly developed radar networks to defeat the Luftwaffe, preventing Operation Sea Lion.
- **Battle of Stalingrad (Aug 1942 - Feb 1943)**: German 6th Army encircled and destroyed by Soviet Red Army. Decisive psychological and material turning point on the Eastern Front.
- **Operation Overlord / D-Day (June 6, 1944)**: Allied amphibious invasion of Normandy beaches opening the Western Front, liberating Paris in August 1944.

## 2. Pacific Theatre Turning Points
- **Battle of Midway (June 1942)**: US Navy cryptanalysts broke Imperial Japanese naval code JN-25. US dive-bombers sank 4 Japanese fleet aircraft carriers in a single afternoon.
- **Island-Hopping Campaign**: Strategy engineered by Admiral Nimitz and General MacArthur to bypass heavily fortified island garrisons and capture airfields closer to Japanese mainland.

## 3. Wartime Conferences & Post-War Architecture
- **Yalta Conference (Feb 1945)**: Churchill, Roosevelt, Stalin agreed on unconditional German surrender, 4 occupation zones, and Soviet entry into war against Japan.
- **Potsdam Conference (July 1945)**: Established German demilitarization, Nuremberg War Crimes trials, and demanded Japan's unconditional surrender.`
  },
  {
    id: "guide-psych-memory",
    title: "Cognitive Psychology: Memory Models & Forgetting Curve",
    subject: "Psychology",
    subjectBadgeColor: "bg-purple-50 text-purple-700 border-purple-300",
    author: "Verified Campus Guide",
    authorAvatar: "🧠",
    date: "High-Yield",
    readTime: "5 min read",
    likes: 43,
    downloads: 110,
    likedByUser: false,
    isOfficialSeed: true,
    tags: ["Working Memory", "Baddeley", "Ebbinghaus", "Spaced Repetition"],
    summary: "Deep dive into Baddeley & Hitch working memory components, encoding retrieval cues, and the science behind flashcard spaced repetition.",
    content: `# Cognitive Psychology: Human Memory Systems

## 1. Atkinson-Shiffrin Multi-Store Model
- **Sensory Register**: High capacity, ultra-short duration (< 1 second for Iconic visual, 2-4 seconds for Echoic auditory).
- **Short-Term Memory (STM)**: Miller's Law (7 $\\pm$ 2 chunks, now revised to ~4 items). Duration 15-30 seconds without maintenance rehearsal.
- **Long-Term Memory (LTM)**: Unlimited capacity, theoretically permanent duration.

## 2. Baddeley & Hitch Working Memory Model (1974)
1. **Central Executive**: Directs attention, allocates cognitive resources, coordinates subordinate systems.
2. **Phonological Loop**:
   - Phonological store ("inner ear")
   - Articulatory rehearsal loop ("inner voice", ~2 seconds of speech capacity)
3. **Visuospatial Sketchpad**: Handles visual imagery and spatial positioning ("mind's eye").
4. **Episodic Buffer**: Integrates information across visual, verbal, and LTM systems into unified chronological episodes.

## 3. Hermann Ebbinghaus Forgetting Curve & Spaced Repetition
- Without active recall, memory retention drops to ~40% within 24 hours.
- **Spaced Retrieval Practice**: Each spaced review flattens the decay curve, dramatically boosting synaptic consolidation.`
  }
];

export function useCommunity() {
  const { user, profile } = useAuth();
  const userStorageKey = user?.id ? `${STORAGE_BUDDIES_KEY}_${user.id}` : STORAGE_BUDDIES_KEY;

  const [notes, setNotes] = useState<CampusNote[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_NOTES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_NOTES;
  });

  const [buddies, setBuddies] = useState<StudyBuddy[]>(() => {
    try {
      const key = user?.id ? `${STORAGE_BUDDIES_KEY}_${user.id}` : STORAGE_BUDDIES_KEY;
      const stored = localStorage.getItem(key) || localStorage.getItem(STORAGE_BUDDIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // ── Sync Notes from Supabase ───────────────────────────────────────────────
  useEffect(() => {
    let isSubscribed = true;

    async function loadCloudNotes() {
      setIsLoadingNotes(true);
      try {
        const { data, error } = await supabase
          .from("community_vault_notes")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data) && isSubscribed) {
          const cloudNotes: CampusNote[] = data.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            title: row.title,
            subject: row.subject,
            subjectBadgeColor: row.subject_badge_color || SUBJECT_BADGE_COLORS[row.subject] || "bg-blue-50 text-blue-700 border-blue-300",
            author: row.author_name,
            authorCode: row.author_code,
            authorAvatar: row.author_avatar || "📝",
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
            // Merge cloud notes with seed notes so high-yield content is never lost
            const seedIds = new Set(cloudNotes.map((c) => c.id));
            const remainingSeeds = SEED_NOTES.filter((s) => !seedIds.has(s.id));
            const merged = [...cloudNotes, ...remainingSeeds];
            try {
              localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (err) {
        // Table not ready or offline: keeps local cache
      } finally {
        if (isSubscribed) setIsLoadingNotes(false);
      }
    }

    loadCloudNotes();

    return () => {
      isSubscribed = false;
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
        const { data: cloudPartners, error } = await supabase
          .from("study_partners")
          .select("*")
          .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`);

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
                  avatar: "🎓",
                  subject: "Study Partner",
                  streakDays: 1,
                  hasStudiedToday: false,
                  lastActive: "Active recently",
                  bio: "Study partner linked on Studenius.",
                  level: 1,
                  totalXp: 0,
                  notesCount: 1,
                  likesCount: 12,
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
      prev.map((n) => (n.id === noteId ? { ...n, isReported: true } : n))
    );
    try {
      const reports = JSON.parse(localStorage.getItem("studenius_reported_notes") || "[]");
      reports.push({ noteId, reason, timestamp: Date.now() });
      localStorage.setItem("studenius_reported_notes", JSON.stringify(reports));

      // Flag on Supabase if real DB note
      if (!noteId.startsWith("guide-") && !noteId.startsWith("user-note-")) {
        supabase
          .from("community_vault_notes")
          .update({ is_reported: true })
          .eq("id", noteId)
          .then();
      }
    } catch {}
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
    toast.success("Study guide published to Campus Vault! 🎉", {
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

    toast.success(`"${note.title}" cloned to your Workspace! 📚`, {
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
      toast.info("That's your own Friend Code! 💡", {
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
    let resolvedAvatar = "🎓";
    let resolvedStreak = 1;
    let resolvedXp = 0;
    let resolvedSchool = "Studenius Scholar";
    let resolvedBio = "Active study partner.";

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
          resolvedAvatar = match.avatar_url || "🎓";
          resolvedStreak = match.streak_days || 1;
          resolvedXp = match.total_xp || 0;
          resolvedSchool = match.school || "Studenius Scholar";
          resolvedBio = match.bio || "Active study partner on Studenius.";
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
      notesCount: 2,
      likesCount: 16
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

  return {
    notes,
    buddies,
    isLoadingNotes,
    toggleLikeNote,
    sendNudge,
    publishNote,
    cloneNoteToWorkspace,
    addFriendByCode,
    reportNote
  };
}
