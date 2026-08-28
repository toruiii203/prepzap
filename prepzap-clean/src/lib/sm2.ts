// SuperMemo-2 (SM-2) Algorithm Implementation

/**
 * Grade definitions:
 * 0: Complete blackout. (Again)
 * 1: Incorrect, but upon seeing the correct answer it felt familiar. (Hard)
 * 2: Correct response recalled with serious difficulty. (Good)
 * 3: Perfect response. (Easy)
 */
export type Grade = 0 | 1 | 2 | 3;

export interface SM2Data {
  interval: number; // in days
  repetitions: number;
  easeFactor: number;
}

export function calculateSM2(
  quality: Grade,
  data: SM2Data
): SM2Data {
  let { interval, repetitions, easeFactor } = data;

  if (quality >= 2) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    // Incorrect response (Again / Hard if we treat 1 as fail-ish for interval reset)
    repetitions = 0;
    interval = 1;
  }

  // Calculate new ease factor
  // The original SM-2 formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // We map our 0-3 scale to the SM-2 0-5 scale roughly:
  // 0 -> 0 (Blackout)
  // 1 -> 2 (Incorrect but familiar)
  // 2 -> 4 (Correct but difficult)
  // 3 -> 5 (Perfect response)
  const mappedQuality = quality === 0 ? 0 : quality === 1 ? 2 : quality === 2 ? 4 : 5;
  
  easeFactor = easeFactor + (0.1 - (5 - mappedQuality) * (0.08 + (5 - mappedQuality) * 0.02));
  
  // Ease factor shouldn't drop below 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  return { interval, repetitions, easeFactor };
}
