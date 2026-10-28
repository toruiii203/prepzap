import Dexie, { type Table } from "dexie";
import { z } from "zod";
import {
  outlineSchema,
  lessonSchema,
  type SavedRoadmap,
} from "./learningRoadmap";
const progressSchema = z.object({
  read: z.boolean(),
  answers: z.record(
    z.object({ choices: z.array(z.number().int().min(0).max(3)) }),
  ),
  recalls: z.record(
    z.object({ response: z.string(), rating: z.enum(["got-it", "practise"]) }),
  ),
  readyAt: z.number().optional(),
  reviewedAt: z.number().optional(),
});
export const savedRoadmapSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  ownerId: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
  topic: z.string(),
  level: z.string(),
  source: z
    .object({ name: z.string(), text: z.string(), coverage: z.string() })
    .optional(),
  outline: outlineSchema,
  lessons: z.record(lessonSchema),
  progress: z.record(progressSchema),
});
class RoadmapDB extends Dexie {
  paths!: Table<SavedRoadmap, [string, string]>;
  constructor() {
    super("StudeniusLearningRoadmaps");
    this.version(1).stores({ paths: "[ownerId+id],ownerId,updatedAt" });
  }
}
const db = new RoadmapDB();
export async function loadRoadmaps(ownerId: string) {
  const paths = await db.paths
    .where("ownerId")
    .equals(ownerId)
    .reverse()
    .sortBy("updatedAt");
  return paths.map((path) => {
    savedRoadmapSchema.parse(path);
    return path;
  });
}
export async function saveRoadmap(path: SavedRoadmap) {
  savedRoadmapSchema.parse(path);
  await db.paths.put(path);
  navigator.storage?.persist?.().catch(() => {
    /* Persistence may be denied; export remains available. */
  });
}
export async function deleteRoadmap(ownerId: string, id: string) {
  await db.paths.delete([ownerId, id]);
}
export function exportRoadmap(path: SavedRoadmap) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(path, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `studenius-${path.id}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseRoadmapBackup(
  value: unknown,
  ownerId: string,
): SavedRoadmap {
  assertSavedRoadmap(value);
  return { ...value, ownerId, id: crypto.randomUUID(), updatedAt: Date.now() };
}
function assertSavedRoadmap(value: unknown): asserts value is SavedRoadmap {
  savedRoadmapSchema.parse(value);
}
