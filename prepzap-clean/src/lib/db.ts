import Dexie, { type Table } from 'dexie';

export interface Deck {
  id?: string;
  title: string;
  createdAt: number;
}

export interface Card {
  id?: string;
  deckId: string;
  front: string;
  back: string;
  explanation?: string;
  
  // SRS Fields
  interval: number; // in days
  repetitions: number;
  easeFactor: number;
  nextReviewDate: number; // unix timestamp
}

export class StudeniusDB extends Dexie {
  decks!: Table<Deck, string>;
  cards!: Table<Card, string>;

  constructor() {
    super('StudeniusDB');
    this.version(1).stores({
      decks: 'id, title, createdAt',
      cards: 'id, deckId, nextReviewDate' // id is primary key, others are indexed
    });
  }
}

export const db = new StudeniusDB();
