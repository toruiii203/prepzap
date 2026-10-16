import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { playTap, playSuccess, playMastery } from "@/lib/soundFX";

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
  code: string;
  avatar: string;
  subject: string;
  streakDays: number;
  hasStudiedToday: boolean;
  lastActive: string;
  lastNudgedAt?: number;
}

const STORAGE_NOTES_KEY = "studenius_campus_notes_v2";
const STORAGE_BUDDIES_KEY = "studenius_study_buddies_v2";

// Authentic, high-yield academic study guides for the Campus Vault (Knowunity model)
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

  // Only real buddies added by code (starts empty for new user)
  const [buddies, setBuddies] = useState<StudyBuddy[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_BUDDIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
    } catch {}
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BUDDIES_KEY, JSON.stringify(buddies));
    } catch {}
  }, [buddies]);

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

  const publishNote = useCallback((newNote: Omit<CampusNote, "id" | "date" | "likes" | "likedByUser">) => {
    const noteToAdd: CampusNote = {
      ...newNote,
      id: `user-note-${Date.now()}`,
      date: "Just now",
      likes: 1,
      likedByUser: true,
      isOfficialSeed: false
    };

    setNotes((prev) => [noteToAdd, ...prev]);

    playSuccess();

    toast.success("Study note published to Campus Vault! 🎉");
    return true;
  }, []);

  const addFriendByCode = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      toast.error("Please enter a valid Friend Code (e.g., REX-4921)");
      return false;
    }

    const existing = buddies.find((b) => b.code === clean);
    if (existing) {
      toast.info("This classmate is already in your study circle!");
      return false;
    }

    const newBuddy: StudyBuddy = {
      id: `buddy-${Date.now()}`,
      name: `Study Partner (${clean})`,
      code: clean,
      avatar: "🎓",
      subject: "Study Partner",
      streakDays: 1,
      hasStudiedToday: false,
      lastActive: "Joined via friend code"
    };

    setBuddies((prev) => [...prev, newBuddy]);

    playMastery();

    toast.success(`Connected with study partner (${clean})! 🔥`);
    return true;
  }, [buddies]);

  return {
    notes,
    buddies,
    toggleLikeNote,
    sendNudge,
    publishNote,
    addFriendByCode
  };
}
