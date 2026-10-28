import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateAndFilterLesson,
  fetchWikipediaImage,
  populateLessonImages,
  generateFallbackVisualLesson,
  generateVisualLesson,
  conceptCardSchema,
  tableCardSchema,
  chartCardSchema,
  recallCardSchema,
  takeawayCardSchema,
  type VisualLesson,
} from "@/lib/visualLessonGeneration";

describe("Visual Lesson Schema & Generation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Schema Validation & Card Filtering", () => {
    it("validates a complete concept card", () => {
      const validConcept = {
        type: "concept",
        id: "c1",
        title: "Mitosis Prophase",
        color_category: "stage",
        what_to_notice: "Chromosomes condensing into visible X-shapes.",
        explanation: "Chromatin fibers condense into distinct chromosomes while the nuclear envelope breaks down.",
        memory_hook: "Prophase = 'Pro' like preparing luggage before a trip.",
        exam_trap: "Don't confuse sister chromatids with homologous chromosomes.",
        callouts: [
          { id: "co1", label: "Centromere", description: "Pinched center holding chromatids together.", x: 30, y: 40 },
          { id: "co2", label: "Spindle Fibers", description: "Microtubules emerging from centrosomes.", x: 70, y: 60 },
        ],
        photoKeywords: ["mitosis prophase", "condensed chromosomes"],
      };

      const result = conceptCardSchema.safeParse(validConcept);
      expect(result.success).toBe(true);
    });

    it("drops invalid cards instead of failing the lesson", () => {
      const rawLessonWithInvalidCards = {
        topic: "Mitosis",
        big_idea: {
          sentence: "Mitosis divides duplicate genetic material into two identical daughter cells.",
          photoKeywords: ["mitosis cell division"],
        },
        cards: [
          // 1. Valid concept card
          {
            type: "concept",
            id: "card_valid",
            title: "Prophase",
            color_category: "stage",
            what_to_notice: "Notice chromatin condensation.",
            explanation: "Nuclear membrane dissolves as chromosomes condense.",
            memory_hook: "Preparing before party.",
            exam_trap: "Watch out for chromosome counts.",
            callouts: [
              { id: "c1", label: "Centromere", description: "Central junction." },
            ],
            photoKeywords: ["prophase"],
          },
          // 2. INVALID card: missing required explanation and callouts
          {
            type: "concept",
            id: "card_broken",
            title: "Broken Concept",
            // missing what_to_notice, explanation, callouts
          },
          // 3. INVALID card: chart with mismatched labels and values
          {
            type: "chart",
            id: "card_bad_chart",
            title: "Phase Duration",
            color_category: "formula",
            chart_type: "bar",
            labels: ["Prophase", "Metaphase", "Anaphase"],
            values: [30, 10], // Mismatched length (2 values for 3 labels)
            unit: "mins",
            caption: "Duration of phases",
          },
          // 4. Valid takeaway card
          {
            type: "takeaway",
            id: "card_takeaway",
            title: "Key Takeaways",
            color_category: "definition",
            points: [
              "Point 1: Exact replication.",
              "Point 2: Spindle alignment.",
              "Point 3: Cytokinesis completion.",
            ],
            exam_trap: "Homologues do not pair in mitosis, only in meiosis.",
          },
        ],
      };

      const validated = validateAndFilterLesson(rawLessonWithInvalidCards, "Mitosis");

      expect(validated.topic).toBe("Mitosis");
      expect(validated.cards).toHaveLength(2);
      expect(validated.cards[0].id).toBe("card_valid");
      expect(validated.cards[1].id).toBe("card_takeaway");
    });

    it("provides fallback lesson when all cards are missing or invalid", () => {
      const emptyLesson = {
        topic: "Photosynthesis",
        cards: [],
      };

      const fallback = validateAndFilterLesson(emptyLesson, "Photosynthesis");

      expect(fallback.topic).toBe("Photosynthesis");
      expect(fallback.cards.length).toBeGreaterThan(0);
      expect(fallback.cards.some((c) => c.type === "concept")).toBe(true);
      expect(fallback.cards.some((c) => c.type === "takeaway")).toBe(true);
    });
  });

  describe("Image Search & Fallback Handling", () => {
    it("returns null when Wikipedia image search fails or network is offline", async () => {
      // Mock global fetch to return 404 or empty
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
        })
      );

      const result = await fetchWikipediaImage("abstract_nonexistent_topic_12345");
      expect(result).toBeNull();
    });

    it("populates imageUrl as null when search returns nothing, without introducing emojis or broken URLs", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ query: { pages: {} } }),
        })
      );

      const lesson: VisualLesson = {
        topic: "Quantum Superposition",
        big_idea: {
          sentence: "Quantum superposition allows particles to exist across multiple states until measured.",
          photoKeywords: ["nonexistent_quantum_query_xyz"],
        },
        cards: [
          {
            type: "concept",
            id: "q1",
            title: "Wavefunction State",
            color_category: "stage",
            what_to_notice: "Notice probability distribution amplitude.",
            explanation: "Linear combination of state vectors represents all potential outcomes simultaneously.",
            memory_hook: "Flipping a coin in the air: it's both heads and tails until caught.",
            exam_trap: "Measurement collapses the state; observation changes the outcome.",
            callouts: [
              { id: "co1", label: "State Vector", description: "Normalized mathematical representation." },
            ],
            photoKeywords: ["nonexistent_wavefunction_query_xyz"],
            imageUrl: null,
          },
        ],
      };

      const populated = await populateLessonImages(lesson);

      expect(populated.big_idea.imageUrl).toBeNull();
      expect(populated.cards[0].type).toBe("concept");
      if (populated.cards[0].type === "concept") {
        expect(populated.cards[0].imageUrl).toBeNull();
      }
    });
  });
  describe("Input Flexibility (object vs string args)", () => {
    it("handles generateFallbackVisualLesson with both string and object input without throwing trim error", () => {
      const fromString = generateFallbackVisualLesson("Photosynthesis");
      expect(fromString.topic).toBe("Photosynthesis");
      expect(fromString.big_idea.sentence).toBeDefined();

      const fromObject = generateFallbackVisualLesson({ topic: "Photosynthesis", sourceTag: "BIO101" });
      expect(fromObject.topic).toBe("Photosynthesis");
      expect(fromObject.sourceTag).toBe("BIO101");
    });

    it("handles generateVisualLesson with options object without throwing e.trim is not a function", async () => {
      // Mock callGroq to return empty string so it falls back cleanly
      const lesson = await generateVisualLesson({
        topic: "The Krebs Cycle",
        sourceText: "Mitochondrial matrix cellular respiration",
      });

      expect(lesson).toBeDefined();
      expect(lesson.topic).toBe("The Krebs Cycle");
      expect(lesson.big_idea.sentence.length).toBeGreaterThan(5);
      expect(lesson.cards.length).toBeGreaterThan(0);
    });
  });
});
