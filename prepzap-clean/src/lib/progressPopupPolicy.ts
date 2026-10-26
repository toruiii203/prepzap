export interface PopupEvent {
  id: string;
  type: string;
  userId: string;
  day: string;
  origin: "entry" | "session";
  priority: number;
  createdAt: number;
}
export interface EntryStreakEvent extends PopupEvent {
  type: "daily-streak";
  origin: "entry";
  streakDays: number;
  studyDays: readonly string[];
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Read-only presentation evidence. Unowned legacy cache entries are deliberately ignored. */
export function verifiedStudyDays(raw: string | null, userId: string, now: Date): string[] {
  try {
    const rows: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(rows)) return [];
    const days = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== "object" || !("user_id" in row) || row.user_id !== userId || !("created_at" in row) || typeof row.created_at !== "string" || !("duration_minutes" in row) || typeof row.duration_minutes !== "number" || !Number.isFinite(row.duration_minutes) || row.duration_minutes <= 0) continue;
      const date = new Date(row.created_at);
      if (!Number.isFinite(date.getTime()) || date > now) continue;
      days.add(localDayKey(date));
    }
    return [...days].sort();
  } catch { return []; }
}

export function entryStreakEvent(userId: string, profileId: string | undefined, streakDays: number | undefined, studyDays: readonly string[], now: Date): EntryStreakEvent | null {
  const day = localDayKey(now);
  if (!userId || profileId !== userId || typeof streakDays !== "number" || !Number.isSafeInteger(streakDays) || streakDays < 1 || !studyDays.includes(day)) return null;
  return { id: `daily-streak:${day}`, type: "daily-streak", userId, day, origin: "entry", priority: 5, createdAt: now.getTime(), streakDays, studyDays };
}

/** One queue; only the entry-streak adapter is enabled in this first slice. */
export class ProgressPopupQueue<T extends PopupEvent> {
  private pending: T[] = [];
  private counts = new Map<string, { entry: number; total: number }>();
  private shown = new Set<string>();
  private active: T | null = null;

  enqueue(event: T) {
    if (!this.pending.some(item => item.id === event.id && item.userId === event.userId) && !this.shown.has(this.key(event))) this.pending.push(event);
  }
  next(userId: string, now: Date): T | null {
    if (this.active) return null;
    this.pending = this.pending.filter(event => event.userId === userId && event.day === localDayKey(now) && now.getTime() - event.createdAt < 5 * 60_000);
    const counts = this.counts.get(userId) || { entry: 0, total: 0 };
    return this.pending.filter(event => counts.total < 2 && (event.origin !== "entry" || counts.entry < 1) && !this.shown.has(this.key(event)))
      .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt)[0] || null;
  }
  presented(event: T) {
    this.active = event;
    this.pending = this.pending.filter(item => item !== event);
    this.shown.add(this.key(event));
    const counts = this.counts.get(event.userId) || { entry: 0, total: 0 };
    this.counts.set(event.userId, { entry: counts.entry + Number(event.origin === "entry"), total: counts.total + 1 });
  }
  dismiss() { this.active = null; }
  clearPending() { this.pending = []; this.dismiss(); }
  private key(event: T) { return `${event.userId}:${event.day}:${event.type}`; }
}

export function popupLedgerKey(userId: string): string { return `pz_popup_seen_v1:${encodeURIComponent(userId)}`; }
interface Ledger { version: 1; day: string; types: string[]; }
function readLedger(storage: Pick<Storage, "getItem">, event: PopupEvent): Ledger {
  const raw = storage.getItem(popupLedgerKey(event.userId));
  if (!raw) return { version: 1, day: event.day, types: [] };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("day" in value) || typeof value.day !== "string" || !("types" in value) || !Array.isArray(value.types) || !value.types.every(type => typeof type === "string")) throw new Error("Invalid popup metadata");
  return { version: 1, day: event.day, types: value.day === event.day ? value.types : [] };
}

/** Call only at a safe display boundary, inside the host's cross-tab Web Lock. */
export function claimPopupDisplay(storage: Pick<Storage, "getItem" | "setItem">, event: PopupEvent): boolean {
  try {
    const ledger = readLedger(storage, event);
    if (ledger.types.includes(event.type)) return false;
    ledger.types.push(event.type);
    const serialized = JSON.stringify(ledger);
    storage.setItem(popupLedgerKey(event.userId), serialized);
    return storage.getItem(popupLedgerKey(event.userId)) === serialized;
  } catch { return false; } // Optional feedback must stay quiet when storage is unavailable.
}
