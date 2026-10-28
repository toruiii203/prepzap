import { z } from "zod";

const text = z.string().trim().min(3).max(5000);
const quote = z.string().trim().min(12).max(300);
export const outlineSchema = z
  .object({
    title: text.max(120),
    summary: text.max(500),
    prerequisites: z.array(text.max(200)).max(5),
    units: z
      .array(
        z.object({
          title: text.max(120),
          objective: text.max(350),
          kind: z.enum(["foundation", "application", "synthesis"]),
          evidence: z.array(quote).max(3).default([]),
        }),
      )
      .min(3)
      .max(8),
  })
  .refine(
    (value) =>
      new Set(value.units.map((unit) => unit.title.toLowerCase())).size ===
      value.units.length,
    "Chapter titles must be distinct",
  )
  .refine(
    (value) => value.units[value.units.length - 1].kind === "synthesis",
    "End with a synthesis chapter",
  );
export type RoadmapOutline = z.infer<typeof outlineSchema>;
const questionSchema = z
  .object({
    prompt: text.max(700),
    options: z.array(z.string().trim().min(1).max(300)).length(4),
    correct: z.number().int().min(0).max(3),
    hint: text.max(700),
    explanation: text.max(1200),
    simplerExample: text.max(1200),
  })
  .refine(
    (value) =>
      new Set(value.options.map((option) => option.toLowerCase())).size === 4,
    "Answer options must be distinct",
  );
export const lessonSchema = z
  .object({
    explanation: text.min(350),
    example: z.object({ problem: text, steps: z.array(text).min(2).max(6) }),
    commonMistake: text,
    evidence: z.array(quote).max(3).default([]),
    guided: z.array(questionSchema).length(2),
    practice: z.array(questionSchema).length(2),
    recall: z
      .array(
        z.object({
          prompt: text,
          answer: text,
          criteria: z.array(text.max(300)).min(2).max(4),
        }),
      )
      .length(2),
    checkpoint: z.array(questionSchema).length(3),
    review: z.array(questionSchema).length(2),
  })
  .refine((value) => {
    const prompts = [
      ...value.guided,
      ...value.practice,
      ...value.checkpoint,
      ...value.review,
    ].map((q) => q.prompt.toLowerCase());
    return new Set(prompts).size === prompts.length;
  }, "Use fresh questions for each stage");
export type RoadmapLesson = z.infer<typeof lessonSchema>;
export type RoadmapQuestion = z.infer<typeof questionSchema>;
export type LessonStage =
  "understand" | "guided" | "practice" | "recall" | "checkpoint" | "review";
export const LESSON_STAGES: LessonStage[] = [
  "understand",
  "guided",
  "practice",
  "recall",
  "checkpoint",
  "review",
];
export const STAGE_LABELS: Record<LessonStage, string> = {
  understand: "Understand",
  guided: "Guided practice",
  practice: "Try it yourself",
  recall: "Recall",
  checkpoint: "Checkpoint",
  review: "Later review",
};
export interface RoadmapSource {
  name: string;
  text: string;
  coverage: string;
}
export interface CheckAttempt {
  choices: number[];
}
export interface UnitProgress {
  read: boolean;
  answers: Record<string, CheckAttempt>;
  recalls: Record<string, { response: string; rating: "got-it" | "practise" }>;
  readyAt?: number;
  reviewedAt?: number;
}
export interface SavedRoadmap {
  version: 1;
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  outline: RoadmapOutline;
  topic: string;
  level: string;
  source?: RoadmapSource;
  lessons: Record<string, RoadmapLesson>;
  progress: Record<string, UnitProgress>;
}
export const emptyProgress = (): UnitProgress => ({
  read: false,
  answers: {},
  recalls: {},
});
export const REVIEW_DELAY = 24 * 60 * 60 * 1000;
export function isReadyForReview(
  lesson: RoadmapLesson,
  progress: UnitProgress,
): boolean {
  return (
    progress.read &&
    lesson.guided.every(
      (_, i) => progress.answers[`guided-${i}`]?.choices.length > 0,
    ) &&
    lesson.practice.every(
      (_, i) => progress.answers[`practice-${i}`]?.choices.length > 0,
    ) &&
    lesson.recall.every(
      (_, i) => progress.recalls[String(i)]?.rating === "got-it",
    ) &&
    lesson.checkpoint.every(
      (_, i) => progress.answers[`checkpoint-${i}`]?.choices.length > 0,
    ) &&
    lesson.checkpoint.filter(
      (q, i) => progress.answers[`checkpoint-${i}`]?.choices[0] === q.correct,
    ).length >= 2
  );
}
export function unitStatus(
  lesson: RoadmapLesson | undefined,
  progress: UnitProgress | undefined,
  now = Date.now(),
): string {
  if (!lesson || !progress) return "Not started";
  if (progress.reviewedAt) return "Reviewed";
  if (progress.readyAt)
    return now >= progress.readyAt + REVIEW_DELAY
      ? "Review due"
      : "Ready for review";
  if (progress.read) return "Practising";
  return "Learning";
}
export function validateEvidence(quotes: string[] = [], source?: RoadmapSource) {
  if (
    source &&
    (!quotes.length || quotes.some((item) => !source.text.includes(item)))
  )
    throw new Error(
      "The generated lesson could not be linked reliably to this file. Try a clearer section or another topic.",
    );
  if (!source && quotes.length)
    throw new Error(
      "The response included unsupported source references. Please retry.",
    );
}
export function parseOutline(
  value: unknown,
  source?: RoadmapSource,
): RoadmapOutline {
  const result = outlineSchema.parse(value);
  for (const unit of result.units) validateEvidence(unit.evidence, source);
  return result;
}
export function parseLesson(
  value: unknown,
  source?: RoadmapSource,
): RoadmapLesson {
  const result = lessonSchema.parse(value);
  validateEvidence(result.evidence, source);
  return result;
}
export const BROAD_TOPICS = new Set([
  "math",
  "mathematics",
  "biology",
  "science",
  "history",
  "english",
  "chemistry",
  "physics",
  "medicine",
  "computer science",
  "economics",
  "psychology",
  "engineering",
]);

export function nextLearningStage(
  lesson: RoadmapLesson,
  progress: UnitProgress,
): LessonStage {
  if (!progress.read) return "understand";
  if (
    lesson.guided.some(
      (_, i) => !progress.answers[`guided-${i}`]?.choices.length,
    )
  )
    return "guided";
  if (
    lesson.practice.some(
      (_, i) => !progress.answers[`practice-${i}`]?.choices.length,
    )
  )
    return "practice";
  if (
    lesson.recall.some(
      (_, i) => progress.recalls[String(i)]?.rating !== "got-it",
    )
  )
    return "recall";
  if (!progress.readyAt) return "checkpoint";
  return "review";
}
