/**
 * PrepZap — Persistent History Store
 * Each tool gets its own localStorage namespace.
 * History entries survive navigation (component unmount).
 */

import type { HistoryEntry } from "@/components/ToolShell";

const MAX_ENTRIES = 20;

export function loadHistory(toolKey: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(`pz_history_${toolKey}`);
    if (!raw) return [];
    const parsed: HistoryEntry[] = JSON.parse(raw);
    // Re-hydrate dates
    return parsed.map(e => ({ ...e, timestamp: new Date(e.timestamp) }));
  } catch {
    return [];
  }
}

export function saveHistory(toolKey: string, entries: HistoryEntry[]) {
  try {
    localStorage.setItem(
      `pz_history_${toolKey}`,
      JSON.stringify(entries.slice(0, MAX_ENTRIES))
    );
  } catch {}
}

export function addHistoryEntry(
  toolKey: string,
  entry: HistoryEntry,
  current: HistoryEntry[]
): HistoryEntry[] {
  const next = [entry, ...current.filter(e => e.id !== entry.id)].slice(0, MAX_ENTRIES);
  saveHistory(toolKey, next);
  return next;
}

export function deleteHistoryEntry(
  toolKey: string,
  id: string,
  current: HistoryEntry[]
): HistoryEntry[] {
  const next = current.filter(e => e.id !== id);
  saveHistory(toolKey, next);
  return next;
}
