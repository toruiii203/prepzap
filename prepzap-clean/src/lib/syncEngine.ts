// syncEngine.ts
// Pull = Supabase -> IndexedDB (get latest data locally)
// Push = IndexedDB outbox -> Supabase (send queued offline writes)
//
// Call runSync() on app load and whenever the browser comes back online.
// Everything here is last-write-wins by `updatedAt` — no CRDTs needed for
// study data like this.

import { supabase } from './supabase'; // your existing client
import { db, type OutboxEntry } from './db';

const SYNCED_TABLES = [
  'flashcardDecks',
  'flashcards',
  'quizSets',
  'quizQuestions',
  'mistakes',
] as const;

// Maps local Dexie table name -> actual Supabase table name.
// Adjust the right-hand values to match your real Supabase table names.
const SUPABASE_TABLE_MAP: Record<(typeof SYNCED_TABLES)[number], string> = {
  flashcardDecks: 'flashcard_decks',
  flashcards: 'flashcards',
  quizSets: 'quiz_sets',
  quizQuestions: 'quiz_questions',
  mistakes: 'mistake_entries',
};

// ---- PULL: bring down anything changed since last sync --------------------

async function pullTable(table: (typeof SYNCED_TABLES)[number]) {
  const supaTable = SUPABASE_TABLE_MAP[table];
  const meta = await db.syncMeta.get(table);
  const since = meta?.lastSyncedAt ?? '1970-01-01T00:00:00.000Z';

  const { data, error } = await supabase
    .from(supaTable)
    .select('*')
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });

  if (error) {
    console.error(`[sync] pull failed for ${table}:`, error.message);
    return;
  }
  if (!data || data.length === 0) return;

  // NOTE: assumes Supabase columns are snake_case and Dexie rows are
  // camelCase. Swap in your actual mapper if you already have one.
  const rows = data.map(toCamelCase);

  await (db[table] as any).bulkPut(rows);

  const latest = rows[rows.length - 1].updatedAt as string;
  await db.syncMeta.put({ table, lastSyncedAt: latest });
}

export async function pullAll() {
  for (const table of SYNCED_TABLES) {
    await pullTable(table);
  }
}

// ---- PUSH: flush queued local writes ---------------------------------------

export async function pushOutbox() {
  const entries = await db.outbox.orderBy('createdAt').toArray();

  for (const entry of entries) {
    const ok = await pushOne(entry);
    if (ok && entry.id !== undefined) {
      await db.outbox.delete(entry.id);
    } else if (entry.id !== undefined) {
      // bump attempts so you can surface "stuck" writes in the UI if needed
      await db.outbox.update(entry.id, { attempts: entry.attempts + 1 });
    }
  }
}

async function pushOne(entry: OutboxEntry): Promise<boolean> {
  const supaTable = SUPABASE_TABLE_MAP[entry.table];
  const payload = toSnakeCase(entry.payload);

  if (entry.operation === 'upsert') {
    const { error } = await supabase.from(supaTable).upsert(payload);
    if (error) {
      console.error(`[sync] push upsert failed for ${entry.table}:`, error.message);
      return false;
    }
    return true;
  }

  if (entry.operation === 'delete') {
    const { error } = await supabase
      .from(supaTable)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', payload.id);
    if (error) {
      console.error(`[sync] push delete failed for ${entry.table}:`, error.message);
      return false;
    }
    return true;
  }

  return false;
}

// ---- Entry point ------------------------------------------------------------

let syncing = false;

// Set this from your UI layer (e.g. a toast or a banner) so the user knows
// why their offline changes aren't syncing — they need to log in again.
export let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

import { ensureFreshAccessToken } from './authSession';

async function ensureValidSession(): Promise<boolean> {
  try {
    await ensureFreshAccessToken();
    return true;
  } catch (err) {
    return false;
  }
}

export async function runSync() {
  if (syncing) return; // avoid overlapping syncs (e.g. rapid online/offline flicker)
  if (!navigator.onLine) return;

  syncing = true;
  try {
    const sessionOk = await ensureValidSession();
    if (!sessionOk) {
      // Don't burn through outbox retries against a dead session — every
      // push would just fail and bump `attempts` for no reason. Local
      // writes stay queued exactly as they are until the user logs back in.
      onSessionExpired?.();
      return;
    }

    // Push first so local edits aren't clobbered by an incoming pull,
    // then pull to pick up anything changed elsewhere.
    await pushOutbox();
    await pullAll();
  } finally {
    syncing = false;
  }
}

// ---- Helpers ------------------------------------------------------------

function toCamelCase(row: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const key in row) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = row[key];
  }
  return out;
}

function toSnakeCase(row: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const key in row) {
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    out[snake] = row[key];
  }
  return out;
}
