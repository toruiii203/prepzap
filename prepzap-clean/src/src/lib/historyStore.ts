/**
 * PrepZap — Persistent History Store
 * Each tool gets its own localStorage namespace, scoped per user UID.
 * Call setHistoryUser(uid) once after sign-in (done in AuthContext).
 */

import type { HistoryEntry } from "@/components/ToolShell";

const MAX_ENTRIES = 20;

let _uid = "anon";

export function setHistoryUser(uid: string) {
  // Migrate legacy (unscoped) keys once per user
  const migratedFlag = `pz_${uid}_history_migrated_v1`;
  if (!localStorage.getItem(migratedFlag)) {
    // Find all legacy pz_history_* keys (no uid prefix)
    const toMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("pz_history_")) toMigrate.push(key);
    }
    toMigrate.forEach((oldKey) => {
      const toolKey = oldKey.replace("pz_history_", "");
      const newKey  = `pz_${uid}_history_${toolKey}`;
      const val = localStorage.getItem(oldKey);
      if (val) {
        localStorage.setItem(newKey, val);
        localStorage.removeItem(oldKey);
      }
    });
    localStorage.setItem(migratedFlag, "1");
  }
  _uid = uid;
}

function historyKey(toolKey: string) {
  return `pz_${_uid}_history_${toolKey}`;
}

export function loadHistory(toolKey: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(toolKey));
    if (!raw) return [];
    const parsed: HistoryEntry[] = JSON.parse(raw);
    return parsed.map(e => ({ ...e, timestamp: new Date(e.timestamp) }));
  } catch {
    return [];
  }
}

export function saveHistory(toolKey: string, entries: HistoryEntry[]) {
  try {
    localStorage.setItem(
      historyKey(toolKey),
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
