// writeLocal.ts
// Every offline-capable module writes through here instead of calling
// Supabase directly. This writes to IndexedDB immediately (so the UI feels
// instant and works offline) and queues the change to sync later.

import { db } from './db';

type SyncedTable =
  | 'flashcardDecks'
  | 'flashcards'
  | 'quizSets'
  | 'quizQuestions'
  | 'mistakes';

export async function upsertLocal<T extends { id: string; updatedAt?: string }>(
  table: SyncedTable,
  row: T
) {
  const stamped = { ...row, updatedAt: new Date().toISOString() };

  await (db[table] as any).put(stamped);
  await db.outbox.add({
    table,
    operation: 'upsert',
    payload: stamped,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });

  // Fire and forget — if we're online this clears the outbox almost
  // instantly; if not, it's a no-op and stays queued.
  import('./syncEngine').then((m) => m.runSync());
}

export async function deleteLocal(table: SyncedTable, id: string) {
  const deletedAt = new Date().toISOString();
  await (db[table] as any).update(id, { deletedAt });
  await db.outbox.add({
    table,
    operation: 'delete',
    payload: { id },
    createdAt: deletedAt,
    attempts: 0,
  });

  import('./syncEngine').then((m) => m.runSync());
}
