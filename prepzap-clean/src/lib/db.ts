// db.ts
// IndexedDB schema (via Dexie) for offline-capable Studenius modules:
// Flashcards, Practice (quizzes), MistakeJournal.
//
// npm install dexie

import Dexie, { type Table } from 'dexie';

// ---- Row types ----------------------------------------------------------
// Mirror your Supabase table shapes. Adjust fields to match your actual
// schema — these are reasonable guesses based on the module names.

export interface FlashcardDeck {
  id: string;          // uuid, same as Supabase row id
  userId: string;
  title: string;
  subject?: string;
  updatedAt: string;   // ISO timestamp, used for sync diffing
  deletedAt?: string | null; // soft delete, so deletions can sync too
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  lastReviewedAt?: string | null;
  masteryLevel?: number; // e.g. 0-5 spaced-repetition style
  updatedAt: string;
  deletedAt?: string | null;
}

export interface QuizSet {
  id: string;
  userId: string;
  title: string;
  subject?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface QuizQuestion {
  id: string;
  quizSetId: string;
  question: string;
  choices: string[];
  correctIndex: number;
  lastAnsweredCorrect?: boolean | null;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface MistakeEntry {
  id: string;
  userId: string;
  sourceModule: 'flashcards' | 'practice';
  sourceId: string;      // flashcard id or quiz question id
  note?: string;
  resolved: boolean;
  updatedAt: string;
  deletedAt?: string | null;
}

// Queued local writes waiting to be pushed to Supabase.
export interface OutboxEntry {
  id?: number;            // auto-increment local id
  table: 'flashcardDecks' | 'flashcards' | 'quizSets' | 'quizQuestions' | 'mistakes';
  operation: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

// Per-table sync bookmarks so pull only fetches what's new.
export interface SyncMeta {
  table: string;   // primary key
  lastSyncedAt: string;
}

// ---- Dexie database -------------------------------------------------------

class StudeniusDB extends Dexie {
  flashcardDecks!: Table<FlashcardDeck, string>;
  flashcards!: Table<Flashcard, string>;
  quizSets!: Table<QuizSet, string>;
  quizQuestions!: Table<QuizQuestion, string>;
  mistakes!: Table<MistakeEntry, string>;
  outbox!: Table<OutboxEntry, number>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('studenius-offline');

    this.version(1).stores({
      // Index fields you'll actually query/filter on. `id` is always the
      // primary key (Dexie's first field), no need to redeclare it with `&`.
      flashcardDecks: 'id, userId, updatedAt',
      flashcards: 'id, deckId, updatedAt',
      quizSets: 'id, userId, updatedAt',
      quizQuestions: 'id, quizSetId, updatedAt',
      mistakes: 'id, userId, sourceModule, resolved, updatedAt',
      outbox: '++id, table, createdAt',
      syncMeta: 'table',
    });
  }
}

export const db = new StudeniusDB();
