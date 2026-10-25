/**
 * studyPathStorage.ts
 * Manages persistent study path progress and unlocks.
 * When a user finishes a lesson node on the study path,
 * it marks the node as completed and automatically unlocks the next node.
 */

export const STORAGE_KEY_COMPLETED_NODES = "pz_completed_nodes";
export const STORAGE_KEY_CURRENT_LESSON_NODE = "pz_current_lesson_node_id";

export function getCompletedNodeIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPLETED_NODES);
    if (!raw) {
      // Default: node-1 is already completed as the diagnostic baseline
      return ["node-1"];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return ["node-1"];
  } catch {
    return ["node-1"];
  }
}

export function markNodeCompleted(nodeId: string): string[] {
  try {
    const current = getCompletedNodeIds();
    if (!current.includes(nodeId)) {
      current.push(nodeId);
      localStorage.setItem(STORAGE_KEY_COMPLETED_NODES, JSON.stringify(current));
      window.dispatchEvent(new Event("pz_path_updated"));
    }
    return current;
  } catch (e) {
    console.error("Failed to mark node completed:", e);
    return getCompletedNodeIds();
  }
}

export function setCurrentLessonNodeId(nodeId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT_LESSON_NODE, nodeId);
  } catch {}
}

export function getCurrentLessonNodeId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_CURRENT_LESSON_NODE);
  } catch {
    return null;
  }
}

export function clearCurrentLessonNodeId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CURRENT_LESSON_NODE);
  } catch {}
}

export function resetPathProgress(): void {
  try {
    localStorage.setItem(STORAGE_KEY_COMPLETED_NODES, JSON.stringify(["node-1"]));
    window.dispatchEvent(new Event("pz_path_updated"));
  } catch {}
}
