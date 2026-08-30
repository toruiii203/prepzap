export interface SRCard {
  cardId: string;
  deckId: string;
  ease: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  lastReview: string;
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';

const STORAGE_KEY = 'studenius_sr_data';

export function loadSRData(): SRCard[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSRData(cards: SRCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function initCard(cardId: string, deckId: string): SRCard {
  return {
    cardId,
    deckId,
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: new Date().toISOString()
  };
}

export function getOrCreateSRCard(cardId: string, deckId: string): SRCard {
  const cards = loadSRData();
  let card = cards.find(c => c.cardId === cardId);
  if (!card) {
    card = initCard(cardId, deckId);
    cards.push(card);
    saveSRData(cards);
  }
  return card;
}

export function reviewCard(card: SRCard, rating: Rating): SRCard {
  let { ease, interval, repetitions } = card;

  if (rating === 'again') {
    repetitions = 0;
    interval = 1;
  } else if (rating === 'hard') {
    ease = Math.max(1.3, ease - 0.15);
    interval = interval > 0 ? interval : 1;
  } else if (rating === 'good') {
    repetitions++;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ease);
  } else if (rating === 'easy') {
    repetitions++;
    ease += 0.15;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ease * 1.3);
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  const updated: SRCard = {
    ...card,
    ease,
    interval,
    repetitions,
    lastReview: new Date().toISOString(),
    nextReview: nextReviewDate.toISOString()
  };

  const cards = loadSRData();
  const idx = cards.findIndex(c => c.cardId === card.cardId);
  if (idx >= 0) {
    cards[idx] = updated;
  } else {
    cards.push(updated);
  }
  saveSRData(cards);

  return updated;
}

export function isDue(card: SRCard): boolean {
  return new Date(card.nextReview) <= new Date();
}

export function getDueCards(deckId: string): SRCard[] {
  return loadSRData().filter(c => c.deckId === deckId && isDue(c));
}

export function getDueCount(deckId?: string): number {
  const cards = loadSRData();
  if (deckId) {
    return cards.filter(c => c.deckId === deckId && isDue(c)).length;
  }
  return cards.filter(c => isDue(c)).length;
}
