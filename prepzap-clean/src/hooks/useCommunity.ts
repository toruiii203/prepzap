import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface CampusNote {
  id: string;
  title: string;
  subject: string;
  subjectBadgeColor: string;
  author: string;
  authorAvatar: string;
  date: string;
  readTime: string;
  likes: number;
  likedByUser?: boolean;
  isOfficialSeed?: boolean;
  tags: string[];
  summary: string;
  content: string;
}

export interface StudyBuddy {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  streakDays: number;
  hasStudiedToday: boolean;
  lastActive: string;
  lastNudgedAt?: number;
  isRexMascot?: boolean;
}

export interface SocialFeedItem {
  id: string;
  userName: string;
  userAvatar: string;
  action: string;
  topic: string;
  timeAgo: string;
  highFived: boolean;
}

const STORAGE_NOTES_KEY = "studenius_campus_notes_v1";
const STORAGE_BUDDIES_KEY = "studenius_study_buddies_v1";
const STORAGE_FEED_KEY = "studenius_social_feed_v1";
const STORAGE_SOCIAL_XP_KEY = "studenius_social_xp_today";
const STORAGE_NUDGE_MUTE_KEY = "studenius_nudges_muted";

const SEED_NOTES: CampusNote[] = [
  {
    id: "seed-bio-cell-resp",
    title: "Cellular Respiration & ATP Synthesis Master Guide",
    subject: "Biology",
    subjectBadgeColor: "bg-emerald-100 text-emerald-800 border-emerald-600",
    author: "AP Bio Ace (Maya)",
    authorAvatar: "🌿",
    date: "2 days ago",
    readTime: "6 min read",
    likes: 84,
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
    id: "seed-calc-derivatives",
    title: "Calculus Derivatives & Core Theorems Cheat Sheet",
    subject: "Calculus",
    subjectBadgeColor: "bg-blue-100 text-blue-800 border-blue-600",
    author: "Jordan C. (Math Club)",
    authorAvatar: "📐",
    date: "Yesterday",
    readTime: "5 min read",
    likes: 67,
    likedByUser: false,
    isOfficialSeed: true,
    tags: ["Chain Rule", "L'Hôpital", "Mean Value Theorem", "Limits"],
    summary: "Essential differentiation rules, trigonometric derivative shortcuts, and critical test-day theorems (MVT, IVT, EVT).",
    content: `# Essential Calculus AB/BC Derivatives Reference

## 1. Core Differentiation Rules
- **Power Rule**: $\\frac{d}{dx}[x^n] = n x^{n-1}$
- **Product Rule**: $(f \\cdot g)' = f'g + fg'$
- **Quotient Rule**: $\\left(\\frac{f}{g}\\right)' = \\frac{f'g - fg'}{g^2}$ (Low d-High minus High d-Low over Low squared)
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
    id: "seed-chem-thermo",
    title: "Thermodynamics & Reaction Kinetics High-Yield Deck",
    subject: "Chemistry",
    subjectBadgeColor: "bg-amber-100 text-amber-800 border-amber-600",
    author: "Elena (Chem TA)",
    authorAvatar: "🧪",
    date: "3 days ago",
    readTime: "7 min read",
    likes: 52,
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
- $\\Delta H (-), \\Delta S (-)$: Spontaneous only at low $T$ ($T < \\Delta H / \\Delta S$).
- $\\Delta H (+), \\Delta S (+)$: Spontaneous only at high $T$ ($T > \\Delta H / \\Delta S$).

## 3. Reaction Kinetics & Rate Laws
- Differential rate law: $\\text{Rate} = k[A]^m[B]^n$
- **Zero Order**: Rate $= k$, linear plot: $[A]$ vs time. Half-life decreases with time.
- **First Order**: Rate $= k[A]$, linear plot: $\\ln[A]$ vs time. Constant half-life: $t_{1/2} = \\frac{0.693}{k}$.
- **Second Order**: Rate $= k[A]^2$, linear plot: $\\frac{1}{[A]}$ vs time. Half-life increases.`
  },
  {
    id: "seed-hist-wwii",
    title: "World War II Pivotal Turning Points & Treaties",
    subject: "History",
    subjectBadgeColor: "bg-rose-100 text-rose-800 border-rose-600",
    author: "Prof. Marcus & History Dept",
    authorAvatar: "🏛️",
    date: "4 days ago",
    readTime: "8 min read",
    likes: 49,
    likedByUser: false,
    isOfficialSeed: true,
    tags: ["Stalingrad", "Midway", "Normandy D-Day", "Yalta Conference"],
    summary: "Strategic military turning points on European and Pacific fronts, wartime conferences, and post-war structural changes.",
    content: `# World War II: Key Turning Points & Strategic Decisions

## 1. European Theatre Turning Points
- **Battle of Britain (1940)**: Royal Air Force (RAF) utilized newly developed radar networks to defeat the Luftwaffe, preventing Operation Sea Lion (German invasion of Britain).
- **Battle of Stalingrad (Aug 1942 - Feb 1943)**: German 6th Army encircled and destroyed by Soviet Red Army. Decisive psychological and material turning point on the Eastern Front.
- **Operation Overlord / D-Day (June 6, 1944)**: Allied amphibious invasion of Normandy beaches opening the long-awaited Western Front, liberating Paris in August 1944.

## 2. Pacific Theatre Turning Points
- **Battle of Midway (June 1942)**: US Navy cryptanalysts broke Imperial Japanese naval code JN-25. US dive-bombers sank 4 Japanese fleet aircraft carriers in a single afternoon, permanently shifting naval momentum.
- **Island-Hopping Campaign**: Strategy engineered by Admiral Nimitz and General MacArthur to bypass heavily fortified island garrisons and capture airfields closer to Japanese mainland.

## 3. Wartime Conferences & Post-War Architecture
- **Yalta Conference (Feb 1945)**: Churchill, Roosevelt, Stalin agreed on unconditional German surrender, 4 occupation zones, and Soviet entry into war against Japan.
- **Potsdam Conference (July 1945)**: Truman, Attlee, Stalin established German demilitarization, Nuremberg War Crimes trials, and issued the Potsdam Declaration demanding Japan's unconditional surrender.`
  },
  {
    id: "seed-psych-memory",
    title: "Cognitive Psychology: Memory Models & Forgetting Curve",
    subject: "Psychology",
    subjectBadgeColor: "bg-purple-100 text-purple-800 border-purple-600",
    author: "Kai (Cognitive Lab)",
    authorAvatar: "🧠",
    date: "5 days ago",
    readTime: "5 min read",
    likes: 43,
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
- **Spaced Retrieval Practice**: Each spaced review flattens the decay curve, dramatically boosting synaptic consolidation (Long-Term Potentiation).`
  }
];

const SEED_BUDDIES: StudyBuddy[] = [
  {
    id: "buddy-rex",
    name: "Rex (Your Study Fox)",
    avatar: "🦊",
    subject: "All Subjects",
    streakDays: 4,
    hasStudiedToday: true,
    lastActive: "Studying right now",
    isRexMascot: true
  },
  {
    id: "buddy-maya",
    name: "Maya Lin",
    avatar: "🌿",
    subject: "AP Biology",
    streakDays: 6,
    hasStudiedToday: true,
    lastActive: "Active 15m ago"
  },
  {
    id: "buddy-lucas",
    name: "Lucas Chen",
    avatar: "📐",
    subject: "Calculus AB",
    streakDays: 4,
    hasStudiedToday: false,
    lastActive: "Last studied yesterday"
  },
  {
    id: "buddy-elena",
    name: "Elena Rostova",
    avatar: "🧪",
    subject: "AP Chemistry",
    streakDays: 9,
    hasStudiedToday: true,
    lastActive: "Active 1h ago"
  }
];

const SEED_FEED: SocialFeedItem[] = [
  {
    id: "feed-1",
    userName: "Maya Lin",
    userAvatar: "🌿",
    action: "completed a 10-question mastery sprint",
    topic: "Cellular Respiration",
    timeAgo: "12m ago",
    highFived: false
  },
  {
    id: "feed-2",
    userName: "Lucas Chen",
    userAvatar: "📐",
    action: "reviewed 24 spaced repetition cards",
    topic: "Calculus Derivatives",
    timeAgo: "45m ago",
    highFived: false
  },
  {
    id: "feed-3",
    userName: "Elena Rostova",
    userAvatar: "🧪",
    action: "scored 100% on Practice Quiz",
    topic: "Reaction Kinetics",
    timeAgo: "2h ago",
    highFived: true
  }
];

export function useCommunity() {
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
      const stored = localStorage.getItem(STORAGE_BUDDIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_BUDDIES;
  });

  const [feed, setFeed] = useState<SocialFeedItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_FEED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_FEED;
  });

  const [socialXpToday, setSocialXpToday] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SOCIAL_XP_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const todayStr = new Date().toDateString();
        if (parsed.date === todayStr) return parsed.xp || 0;
      }
    } catch {}
    return 0;
  });

  const [nudgesMuted, setNudgesMuted] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_NUDGE_MUTE_KEY) === "true";
  });

  // Persist notes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
    } catch {}
  }, [notes]);

  // Persist buddies
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BUDDIES_KEY, JSON.stringify(buddies));
    } catch {}
  }, [buddies]);

  // Persist feed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FEED_KEY, JSON.stringify(feed));
    } catch {}
  }, [feed]);

  // Toggle Like on note
  const toggleLikeNote = useCallback((noteId: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          const liked = !n.likedByUser;
          return {
            ...n,
            likedByUser: liked,
            likes: liked ? n.likes + 1 : Math.max(0, n.likes - 1)
          };
        }
        return n;
      })
    );
  }, []);

  // Send a playful nudge
  const sendNudge = useCallback((buddyId: string) => {
    const buddy = buddies.find((b) => b.id === buddyId);
    if (!buddy) return;

    // Check cooldown (5 minutes)
    const now = Date.now();
    if (buddy.lastNudgedAt && now - buddy.lastNudgedAt < 5 * 60 * 1000) {
      toast.info(`You already nudged ${buddy.name}! Give them a bit of time.`);
      return;
    }

    try {
      const audio = new Audio("/sounds/short_tap.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}

    setBuddies((prev) =>
      prev.map((b) => (b.id === buddyId ? { ...b, lastNudgedAt: now } : b))
    );

    toast.success(`Sent a friendly streak reminder to ${buddy.name}! 🔥`, {
      description: "Mutual accountability keeps the streak burning!"
    });
  }, [buddies]);

  // High-five a friend feed item (+5 XP up to 15 XP daily max)
  const sendHighFive = useCallback((feedItemId: string) => {
    const item = feed.find((f) => f.id === feedItemId);
    if (!item || item.highFived) return;

    const MAX_DAILY_SOCIAL_XP = 15;
    const canEarnXp = socialXpToday < MAX_DAILY_SOCIAL_XP;
    const xpGain = canEarnXp ? 5 : 0;

    try {
      const audio = new Audio("/sounds/xp_point.mp3");
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch {}

    setFeed((prev) =>
      prev.map((f) => (f.id === feedItemId ? { ...f, highFived: true } : f))
    );

    if (canEarnXp) {
      const nextXp = Math.min(MAX_DAILY_SOCIAL_XP, socialXpToday + xpGain);
      setSocialXpToday(nextXp);
      try {
        localStorage.setItem(
          STORAGE_SOCIAL_XP_KEY,
          JSON.stringify({ date: new Date().toDateString(), xp: nextXp })
        );
      } catch {}
      toast.success(`🙌 High-five sent to ${item.userName}! (+5 XP)`, {
        description: `Social XP today: ${nextXp}/${MAX_DAILY_SOCIAL_XP} max.`
      });
    } else {
      toast.success(`🙌 High-five sent to ${item.userName}!`, {
        description: "You've reached today's +15 XP social reward cap."
      });
    }
  }, [feed, socialXpToday]);

  // Publish a new note to Campus Vault
  const publishNote = useCallback((newNote: Omit<CampusNote, "id" | "date" | "likes" | "likedByUser">) => {
    // Basic profanity check
    const badWords = ["spam", "scam", "nude", "hack"];
    const textToCheck = `${newNote.title} ${newNote.summary} ${newNote.content}`.toLowerCase();
    const hasBadWord = badWords.some((w) => textToCheck.includes(w));
    if (hasBadWord) {
      toast.error("Note contains prohibited terms. Please keep content academic.");
      return false;
    }

    const noteToAdd: CampusNote = {
      ...newNote,
      id: `user-note-${Date.now()}`,
      date: "Just now",
      likes: 1,
      likedByUser: true,
      isOfficialSeed: false
    };

    setNotes((prev) => [noteToAdd, ...prev]);

    try {
      const audio = new Audio("/sounds/star_chime.mp3");
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch {}

    toast.success("Study note published to Campus Vault! 🎉 (+25 XP)");
    return true;
  }, []);

  // Add friend by code
  const addFriendByCode = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      toast.error("Please enter a valid Friend Code (e.g., REX-4921)");
      return false;
    }

    // Generate random avatar & name for demo
    const sampleNames = ["Samira Patel", "Devon Vance", "Zoe Albright", "Noah Sterling"];
    const sampleAvatars = ["⚡", "🚀", "🎯", "🌟"];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randomAvatar = sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)];

    const newBuddy: StudyBuddy = {
      id: `buddy-${Date.now()}`,
      name: `${randomName} (${clean})`,
      avatar: randomAvatar,
      subject: "Study Partner",
      streakDays: 1,
      hasStudiedToday: false,
      lastActive: "Joined via friend code"
    };

    setBuddies((prev) => [...prev, newBuddy]);

    try {
      const audio = new Audio("/sounds/winner.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}

    toast.success(`Friend added! You are now studying with ${randomName}! 🔥`);
    return true;
  }, []);

  const toggleNudgeMute = useCallback(() => {
    setNudgesMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_NUDGE_MUTE_KEY, String(next));
      if (next) {
        toast.info("Nudges muted. You won't receive streak reminder sounds.");
      } else {
        toast.success("Nudges enabled! Friends can encourage your streak.");
      }
      return next;
    });
  }, []);

  return {
    notes,
    buddies,
    feed,
    socialXpToday,
    maxDailySocialXp: 15,
    nudgesMuted,
    toggleNudgeMute,
    toggleLikeNote,
    sendNudge,
    sendHighFive,
    publishNote,
    addFriendByCode
  };
}
