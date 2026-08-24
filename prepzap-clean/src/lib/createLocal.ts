// createLocal.ts
// Creates new records fully offline. IDs are generated client-side with
// crypto.randomUUID(), so no server round-trip is needed before the row
// exists locally — upsertLocal's `put` inserts it since Dexie doesn't care
// whether the id is new or existing, and Supabase's `upsert` does the same
// on the way up.

import { upsertLocal } from './writeLocal';
import type { FlashcardDeck, Flashcard, QuizSet, QuizQuestion, MistakeEntry } from './db';

function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

// ---- Flashcards -----------------------------------------------------------

export function createFlashcardDeck(userId: string, title: string, subject?: string) {
  const deck: FlashcardDeck = {
    id: newId(),
    userId,
    title,
    subject,
    updatedAt: nowIso(),
  };
  return upsertLocal('flashcardDecks', deck).then(() => deck);
}

export function createFlashcard(deckId: string, front: string, back: string) {
  const card: Flashcard = {
    id: newId(),
    deckId,
    front,
    back,
    masteryLevel: 0,
    updatedAt: nowIso(),
  };
  return upsertLocal('flashcards', card).then(() => card);
}

// ---- Practice quizzes -----------------------------------------------------

export function createQuizSet(userId: string, title: string, subject?: string) {
  const quizSet: QuizSet = {
    id: newId(),
    userId,
    title,
    subject,
    updatedAt: nowIso(),
  };
  return upsertLocal('quizSets', quizSet).then(() => quizSet);
}

export function createQuizQuestion(
  quizSetId: string,
  question: string,
  choices: string[],
  correctIndex: number
) {
  const q: QuizQuestion = {
    id: newId(),
    quizSetId,
    question,
    choices,
    correctIndex,
    updatedAt: nowIso(),
  };
  return upsertLocal('quizQuestions', q).then(() => q);
}

// ---- Mistake journal --------------------------------------------------------
// Usually created automatically (e.g. when a practice answer is wrong),
// but exposed here in case you want a manual "add to journal" action too.

export function createMistakeEntry(
  userId: string,
  sourceModule: 'flashcards' | 'practice',
  sourceId: string,
  note?: string
) {
  const entry: MistakeEntry = {
    id: newId(),
    userId,
    sourceModule,
    sourceId,
    note,
    resolved: false,
    updatedAt: nowIso(),
  };
  return upsertLocal('mistakes', entry).then(() => entry);
}
