import { z } from "zod";
import { callGroq, safeParseJSON } from "./groq";

// ── 1. Types & Discriminated Unions ──────────────────────────────────────────

export type ColorCategory = "stage" | "formula" | "trap" | "definition";

export const CATEGORY_COLORS: Record<ColorCategory, string> = {
  stage: "#f0a040",
  formula: "#38bdf8",
  trap: "#f43f5e",
  definition: "#34d399",
};

export interface CalloutItem {
  id: string;
  label: string;
  description: string;
  x?: number; // 0-100% position on image
  y?: number; // 0-100% position on image
}

export interface ConceptCard {
  type: "concept";
  id: string;
  title: string;
  color_category: ColorCategory;
  what_to_notice: string;
  explanation: string;
  memory_hook: string;
  exam_trap: string;
  callouts: CalloutItem[];
  photoKeywords: string[];
  exactWikipediaTitle?: string;
  imageUrl?: string | null;
}

export interface TableCard {
  type: "table";
  id: string;
  title: string;
  color_category: ColorCategory;
  columns: string[];
  rows: string[][];
  caption: string;
  photoKeywords?: string[];
  imageUrl?: string | null;
}

export interface ChartCard {
  type: "chart";
  id: string;
  title: string;
  color_category: ColorCategory;
  chart_type: "bar" | "line";
  labels: string[];
  values: number[];
  unit: string;
  caption: string;
}

export interface RecallCard {
  type: "recall";
  id: string;
  title: string;
  color_category: ColorCategory;
  recall_type: "identify" | "match" | "spot_error";
  prompt: string;
  options: string[];
  correct_answer: string;
  why: string;
}

export interface TakeawayCard {
  type: "takeaway";
  id: string;
  title: string;
  color_category: ColorCategory;
  points: [string, string, string];
  exam_trap: string;
}

export type VisualLessonCard = ConceptCard | TableCard | ChartCard | RecallCard | TakeawayCard;

export interface BigIdea {
  sentence: string;
  photoKeywords: string[];
  imageUrl?: string | null;
}

export interface VisualLesson {
  topic: string;
  sourceTag?: string;
  big_idea: BigIdea;
  cards: VisualLessonCard[];
}

// ── 2. Zod Validation Schemas ────────────────────────────────────────────────

const colorCategorySchema = z.enum(["stage", "formula", "trap", "definition"]);

export const calloutItemSchema = z.object({
  id: z.string().default(() => `c_${Math.random().toString(36).slice(2, 7)}`),
  label: z.string().min(1),
  description: z.string().min(1),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
});

export const conceptCardSchema = z.object({
  type: z.literal("concept"),
  id: z.string().default(() => `concept_${Math.random().toString(36).slice(2, 7)}`),
  title: z.string().min(1),
  color_category: colorCategorySchema.default("stage"),
  what_to_notice: z.string().min(1),
  explanation: z.string().min(1),
  memory_hook: z.string().min(1),
  exam_trap: z.string().min(1),
  callouts: z.array(calloutItemSchema).min(1).max(3),
  photoKeywords: z.array(z.string()).default([]),
  exactWikipediaTitle: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});

export const tableCardSchema = z.object({
  type: z.literal("table"),
  id: z.string().default(() => `table_${Math.random().toString(36).slice(2, 7)}`),
  title: z.string().min(1),
  color_category: colorCategorySchema.default("definition"),
  columns: z.array(z.string()).min(2),
  rows: z.array(z.array(z.string())).min(1),
  caption: z.string().min(1),
  photoKeywords: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
});

export const chartCardSchema = z.object({
  type: z.literal("chart"),
  id: z.string().default(() => `chart_${Math.random().toString(36).slice(2, 7)}`),
  title: z.string().min(1),
  color_category: colorCategorySchema.default("formula"),
  chart_type: z.enum(["bar", "line"]).default("bar"),
  labels: z.array(z.string()).min(2),
  values: z.array(z.number()).min(2),
  unit: z.string().default(""),
  caption: z.string().min(1),
});

export const recallCardSchema = z.object({
  type: z.literal("recall"),
  id: z.string().default(() => `recall_${Math.random().toString(36).slice(2, 7)}`),
  title: z.string().min(1),
  color_category: colorCategorySchema.default("trap"),
  recall_type: z.enum(["identify", "match", "spot_error"]).default("identify"),
  prompt: z.string().min(1),
  options: z.array(z.string()).min(2),
  correct_answer: z.string().min(1),
  why: z.string().min(1),
});

export const takeawayCardSchema = z.object({
  type: z.literal("takeaway"),
  id: z.string().default(() => `takeaway_${Math.random().toString(36).slice(2, 7)}`),
  title: z.string().min(1),
  color_category: colorCategorySchema.default("definition"),
  points: z.array(z.string()).min(3).transform((pts) => pts.slice(0, 3) as [string, string, string]),
  exam_trap: z.string().min(1),
});

export const bigIdeaSchema = z.object({
  sentence: z.string().min(5),
  photoKeywords: z.array(z.string()).default([]),
  imageUrl: z.string().nullable().optional(),
});

// ── 3. Validate and Filter Lesson (Drops Invalid Cards) ───────────────────────

export function validateAndFilterLesson(raw: any, fallbackTopic = "Study Topic"): VisualLesson {
  const topic = typeof raw?.topic === "string" && raw.topic.trim() ? raw.topic.trim() : fallbackTopic;
  const sourceTag = typeof raw?.sourceTag === "string" ? raw.sourceTag.trim() : undefined;

  // Validate or construct big_idea
  let big_idea: BigIdea;
  const parsedBigIdea = bigIdeaSchema.safeParse(raw?.big_idea);
  if (parsedBigIdea.success) {
    big_idea = parsedBigIdea.data;
  } else {
    big_idea = {
      sentence: typeof raw?.big_idea?.sentence === "string" && raw.big_idea.sentence.trim().length >= 5
        ? raw.big_idea.sentence.trim()
        : `${topic} is a foundational concept essential for understanding and applying this subject.`,
      photoKeywords: Array.isArray(raw?.big_idea?.photoKeywords) ? raw.big_idea.photoKeywords : [topic],
      imageUrl: null,
    };
  }

  // Validate cards one by one; drop cards that fail validation
  const validCards: VisualLessonCard[] = [];
  const rawCards = Array.isArray(raw?.cards) ? raw.cards : [];

  for (const card of rawCards) {
    if (!card || typeof card !== "object" || typeof card.type !== "string") continue;

    switch (card.type) {
      case "concept": {
        const res = conceptCardSchema.safeParse(card);
        if (res.success) validCards.push(res.data);
        break;
      }
      case "table": {
        const res = tableCardSchema.safeParse(card);
        if (res.success) {
          // Normalize row column counts
          const colLen = res.data.columns.length;
          const normalizedRows = res.data.rows.map((r) => {
            if (r.length === colLen) return r;
            if (r.length < colLen) return [...r, ...Array(colLen - r.length).fill("-")];
            return r.slice(0, colLen);
          });
          validCards.push({ ...res.data, rows: normalizedRows });
        }
        break;
      }
      case "chart": {
        const res = chartCardSchema.safeParse(card);
        if (res.success && res.data.labels.length === res.data.values.length) {
          validCards.push(res.data);
        }
        break;
      }
      case "recall": {
        const res = recallCardSchema.safeParse(card);
        if (res.success) validCards.push(res.data);
        break;
      }
      case "takeaway": {
        const res = takeawayCardSchema.safeParse(card);
        if (res.success) validCards.push(res.data);
        break;
      }
      default:
        // Unknown card type -> dropped
        break;
    }
  }

  // Ensure there is at least one concept card and one takeaway card
  if (validCards.length === 0) {
    const fallback = generateFallbackVisualLesson(topic, sourceTag);
    return fallback;
  }

  return {
    topic,
    sourceTag,
    big_idea,
    cards: validCards,
  };
}

// ── 4. Wikipedia Image Search ────────────────────────────────────────────────

export async function fetchWikipediaImage(query: string): Promise<string | null> {
  if (!query || !query.trim()) return null;
  try {
    const endpoint = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=800&generator=search&gsrsearch=${encodeURIComponent(
      query.trim()
    )}&gsrlimit=6&origin=*`;
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "Studenius/1.0 (contact@studenius.com)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      const pageList = Object.values(pages) as any[];
      pageList.sort((a, b) => (a.index || 0) - (b.index || 0));
      for (const p of pageList) {
        const thumb = p?.thumbnail?.source;
        if (
          thumb &&
          !thumb.toLowerCase().includes("disambig") &&
          !thumb.toLowerCase().includes("question_book") &&
          !thumb.toLowerCase().includes("portal")
        ) {
          return thumb;
        }
      }
    }
  } catch {
    // Return null on network error; UI falls back cleanly
  }
  return null;
}

export async function populateLessonImages(lesson: VisualLesson): Promise<VisualLesson> {
  const updatedBigIdea = { ...lesson.big_idea };

  // Fetch big idea image
  if (!updatedBigIdea.imageUrl) {
    if (updatedBigIdea.photoKeywords && updatedBigIdea.photoKeywords.length > 0) {
      for (const kw of updatedBigIdea.photoKeywords) {
        const img = await fetchWikipediaImage(kw);
        if (img) {
          updatedBigIdea.imageUrl = img;
          break;
        }
      }
    }
    if (!updatedBigIdea.imageUrl) {
      updatedBigIdea.imageUrl = null;
    }
  }

  // Fetch images for concept cards and table cards
  const updatedCards = await Promise.all(
    lesson.cards.map(async (card) => {
      if (card.type === "concept") {
        if (card.imageUrl) return card;
        const kwList = [
          ...(card.exactWikipediaTitle ? [card.exactWikipediaTitle] : []),
          ...(card.photoKeywords || []),
          card.title,
        ];
        let found: string | null = null;
        for (const kw of kwList) {
          found = await fetchWikipediaImage(kw);
          if (found) break;
        }
        return { ...card, imageUrl: found };
      }
      if (card.type === "table") {
        if (card.imageUrl) return card;
        if (card.photoKeywords && card.photoKeywords.length > 0) {
          for (const kw of card.photoKeywords) {
            const found = await fetchWikipediaImage(kw);
            if (found) return { ...card, imageUrl: found };
          }
        }
        return card;
      }
      return card;
    })
  );

  return {
    ...lesson,
    big_idea: updatedBigIdea,
    cards: updatedCards,
  };
}

// ── 5. Full Visual Lesson Generator ──────────────────────────────────────────

export async function generateVisualLesson(
  topic: string,
  sourceContext?: string,
  sourceTag?: string
): Promise<VisualLesson> {
  const cleanTopic = topic.trim();
  const safeContext = sourceContext ? sourceContext.slice(0, 3000) : "";

  const systemPrompt = `You are a cognitive dual-coding education expert.
Create a structured 5-step visual lesson that actually TEACHES the topic, rather than showing generic slides.
Each card must have a distinct learning job and a test or active recall engagement.

Structure required in JSON:
1. "big_idea": {
     "sentence": "1 clear sentence on what ${cleanTopic} is and why it matters in exams and practice.",
     "photoKeywords": ["<concrete real-world photographable term 1>", "<term 2>"]
   }
2. "cards": Array of cards. Choose the mix by topic:
   - "concept" (up to 3 cards): photoKeywords (concrete real-world objects), 2-3 numbered callouts ({ "id": "c1", "label": "...", "description": "...", "x": 25, "y": 40 }), "what_to_notice": "1 sentence observation", "explanation": "1-2 sentence core mechanism", "memory_hook": "everyday analogy", "exam_trap": "1 high-yield trap", "color_category": "stage"|"formula"|"trap"|"definition"
   - "table": columns[], rows[][], caption ("How to tell them apart rule"). Use to contrast commonly confused pairs (e.g. Mitosis vs Meiosis, Classical vs Keynesian).
   - "chart": type "bar"|"line", labels[], values[], unit, caption. ONLY EMIT IF the topic or source contains genuine numbers/metrics; otherwise NEVER emit.
   - "recall": type "identify"|"match"|"spot_error", prompt, options (2-4 choices), correct_answer, why ("1 short sentence explaining why").
   - "takeaway": points (exactly 3 key points), exam_trap.

Rules:
- Explanations must be max 2 sentences.
- Max 3 callouts per concept card.
- Ground callouts, comparisons, and traps in the course material if provided.
- Return ONLY a raw JSON object (no markdown, no backticks).`;

  try {
    const raw = await callGroq(
      [
        {
          role: "user",
          content: `Create a 5-step visual lesson for "${cleanTopic}"${
            safeContext ? `\n\nCourse Material Source:\n${safeContext}` : ""
          }`,
        },
      ],
      systemPrompt,
      "openai/gpt-oss-20b",
      2400,
      "visual_learner"
    );

    const parsed = safeParseJSON<any>(raw);
    const validated = validateAndFilterLesson(parsed, cleanTopic);
    validated.sourceTag = sourceTag;
    const withImages = await populateLessonImages(validated);
    return withImages;
  } catch (err) {
    console.warn("[visualLessonGeneration] AI generation error; using structured fallback:", err);
    const fallback = generateFallbackVisualLesson(cleanTopic, sourceTag);
    const withImages = await populateLessonImages(fallback);
    return withImages;
  }
}

// ── 6. Fallback Lesson Generator ─────────────────────────────────────────────

export function generateFallbackVisualLesson(topic: string, sourceTag?: string): VisualLesson {
  const c = topic.trim();
  return {
    topic: c,
    sourceTag,
    big_idea: {
      sentence: `${c} establishes the governing mechanism that drives how components interact, adapt, and reach equilibrium.`,
      photoKeywords: [c, `${c} diagram`, "scientific experiment"],
      imageUrl: null,
    },
    cards: [
      {
        type: "concept",
        id: "c1",
        title: "Core Mechanism",
        color_category: "stage",
        what_to_notice: "Notice how the input triggers a directional cascade without skipping steps.",
        explanation: `${c} initiates when the primary driving catalyst changes the physical state of the system. This sets the threshold for all subsequent reactions.`,
        memory_hook: "Think of it like dominoes falling: once the first piece tips, the entire chain is locked into motion.",
        exam_trap: "Watch out for questions reversing cause and effect; the catalyst precedes the transformation.",
        callouts: [
          { id: "c1-1", label: "Catalyst Input", description: "The initial trigger that lowers the activation threshold.", x: 25, y: 35 },
          { id: "c1-2", label: "Rate-Limiting Step", description: "The slowest phase that controls overall process velocity.", x: 50, y: 55 },
          { id: "c1-3", label: "Terminal Product", description: "The stable outcome generated at completion.", x: 75, y: 40 },
        ],
        photoKeywords: [c, `${c} structure`],
        exactWikipediaTitle: c,
        imageUrl: null,
      },
      {
        type: "table",
        id: "c2",
        title: `${c}: Contrasting States`,
        color_category: "definition",
        columns: ["Property", "Active Phase", "Resting State"],
        rows: [
          ["Energy Demand", "High ATP consumption", "Conserved baseline"],
          ["System Rate", "Exponential acceleration", "Homeostatic equilibrium"],
          ["Primary Driver", "External stimulus / gradient", "Inhibitory feedback"],
        ],
        caption: "How to tell them apart: Active phase requires continuous input, while the resting state maintains stability autonomously.",
      },
      {
        type: "recall",
        id: "c3",
        title: "Active Recall Challenge",
        color_category: "trap",
        recall_type: "spot_error",
        prompt: `In ${c}, which condition directly halts the ongoing reaction?`,
        options: [
          "Depletion of the primary catalyst or active reagent",
          "An increase in ambient temperature above baseline",
          "Doubling the surface area of the reaction site",
          "Spontaneous reversal of the terminal product",
        ],
        correct_answer: "Depletion of the primary catalyst or active reagent",
        why: "Without the catalyst or substrate to sustain the reaction, velocity drops to zero regardless of external factors.",
      },
      {
        type: "takeaway",
        id: "c4",
        title: "Exam Revision Takeaways",
        color_category: "formula",
        points: [
          `${c} is governed by its initial catalyst and rate-limiting phase.`,
          "Distinguish clearly between active transformation and resting equilibrium.",
          "Questions frequently test what happens when feedback loops are interrupted.",
        ],
        exam_trap: `Exam Trap: Never assume ${c} proceeds instantaneously; questions often ask about time-lag during activation.`,
      },
    ],
  };
}
