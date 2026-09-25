import { callGroq, safeParseJSON } from "./groq";
import { supabase } from "./supabase";

export type ArcadeGameType = "memory_match" | "true_false" | "termle" | "anagram_sprint" | "whack_a_mole" | "odd_one_out";

export interface MemoryMatchPair {
  term: string;
  definition: string;
}

export interface TrueFalseStatement {
  statement: string;
  isTrue: boolean;
}

export interface TermleWord {
  word: string;
  hint: string;
}

export interface WhackAMoleQuestion {
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
}

export interface OddOneOutRound {
  items: string[];
  oddIndex: number;
  reason: string;
}


type ArcadeContentMap = {
  memory_match: MemoryMatchPair[];
  true_false: TrueFalseStatement[];
  termle: TermleWord[];
  anagram_sprint: TermleWord[];
  whack_a_mole: WhackAMoleQuestion[];
  odd_one_out: OddOneOutRound[];
};

// Fallback bank
export const FALLBACKS: Record<string, ArcadeContentMap> = {
  general: {
    memory_match: [
      { term: "Hypothesis", definition: "A proposed explanation based on limited evidence." },
      { term: "Variable", definition: "An element, feature, or factor that is liable to vary or change." },
      { term: "Theory", definition: "A well-substantiated explanation of some aspect of the natural world." },
      { term: "Data", definition: "Facts and statistics collected together for reference or analysis." },
      { term: "Analysis", definition: "Detailed examination of the elements or structure of something." }
    ],
    true_false: [
      { statement: "A hypothesis is always proven to be true.", isTrue: false },
      { statement: "Data can be both qualitative and quantitative.", isTrue: true },
      { statement: "A theory is an unproven guess.", isTrue: false }
    ],
    termle: [
      { word: "STUDY", hint: "To devote time and attention to acquiring knowledge." },
      { word: "FOCUS", hint: "The center of interest or activity." },
      { word: "LEARN", hint: "Gain or acquire knowledge of or skill in." }
    ]
 ,
    anagram_sprint: [
      { word: "theory", hint: "A well-substantiated explanation is called a _____." },
      { word: "variable", hint: "An element liable to change is a _____." }
    ],
    whack_a_mole: [
      { question: "What is the powerhouse of the cell?", correctAnswer: "Mitochondria", wrongAnswers: ["Nucleus", "Ribosome", "Chloroplast"] },
      { question: "Which particle has a positive charge?", correctAnswer: "Proton", wrongAnswers: ["Electron", "Neutron", "Photon"] }
    ],
    odd_one_out: [
      { items: ["Dog", "Cat", "Lion", "Oak Tree"], oddIndex: 3, reason: "Oak Tree is a plant, while the others are animals." },
      { items: ["Iron", "Copper", "Water", "Gold"], oddIndex: 2, reason: "Water is a compound, while the others are pure elemental metals." }
    ]
  },
  // Add more subjects here (math, biology, chemistry, history) as needed. For MVP, we route to general if not found.
};

const PROMPTS = {
  memory_match: "Generate a JSON array of exactly 8 objects with keys 'term' and 'definition' based on the following content. Keep definitions under 15 words.",
  true_false: "Generate a JSON array of exactly 10 objects with keys 'statement' (string) and 'isTrue' (boolean) based on the following content.",
  termle: "Generate a JSON array of exactly 5 objects with keys 'word' (string, exactly 5 letters, ONLY letters, UPPERCASE) and 'hint' (string, under 10 words) based on the following content. Ensure the word is a valid English word and strongly relevant to the topic.",
  anagram_sprint: "",
  whack_a_mole: "Generate a JSON array of 10-15 objects with keys 'question' (string), 'correctAnswer' (string), and 'wrongAnswers' (array of exactly 3 strings). Base this on the provided content. Make sure questions are concise and answers are short.",
  odd_one_out: "Generate a JSON array of 8-10 objects with keys 'items' (array of exactly 4 strings), 'oddIndex' (integer between 0 and 3 indicating which item does not belong), and 'reason' (string briefly explaining why it is the odd one out). Base this on the provided content."
};

// Helper: robust dictionary check for Termle could go here. For now, rely on length validation.
function validateResult<T extends ArcadeGameType>(type: T, parsed: any): parsed is ArcadeContentMap[T] {
  if (!Array.isArray(parsed) || parsed.length === 0) return false;
  
  if (type === "memory_match") {
    return parsed.every(p => typeof p.term === 'string' && typeof p.definition === 'string');
  }
  if (type === "true_false") {
    return parsed.every(p => typeof p.statement === 'string' && typeof p.isTrue === 'boolean');
  }
  if (type === "whack_a_mole") {
    return parsed.every((p: any) => 
      typeof p.question === 'string' && 
      typeof p.correctAnswer === 'string' &&
      Array.isArray(p.wrongAnswers) && p.wrongAnswers.length === 3 &&
      p.wrongAnswers.every((wa: any) => typeof wa === 'string')
    );
  }
  if (type === "odd_one_out") {
    return parsed.every((p: any) => 
      Array.isArray(p.items) && p.items.length === 4 &&
      p.items.every((it: any) => typeof it === 'string') &&
      typeof p.oddIndex === 'number' && p.oddIndex >= 0 && p.oddIndex <= 3 &&
      typeof p.reason === 'string'
    );
  }
  if (type === "anagram_sprint") return true;
  if (type === "termle") {
    return parsed.every(p => 
      typeof p.word === 'string' && 
      p.word.length >= 4 && p.word.length <= 10 && 
      /^[A-Z]+$/.test(p.word) &&
      typeof p.hint === 'string'
    );
  }
  return false;
}

export async function generateGameContent<T extends ArcadeGameType>(
  sourceText: string,
  sourceId: string,
  gameType: T,
  userId: string
): Promise<ArcadeContentMap[T]> {
  // 1. Check Cache
  if (sourceId) {
    const { data } = await supabase
      .from("arcade_cache")
      .select("content")
      .eq("source_id", sourceId)
      .eq("game_type", gameType)
      .eq("user_id", userId)
      .single();
      
    if (data && data.content) {
      return data.content as ArcadeContentMap[T];
    }
  }

  // 2. Generate with Validation loop
  let attempts = 0;
  while (attempts < 2) {
    try {
      attempts++;
      const raw = await callGroq(`${PROMPTS[gameType]}\n\nSource Content: ${sourceText.slice(0, 10000)}`);
      const parsed = safeParseJSON(raw);
      
      if (validateResult(gameType, parsed)) {
        // Cache it
        if (sourceId) {
          await supabase.from("arcade_cache").insert({
            user_id: userId,
            source_id: sourceId,
            game_type: gameType,
            content: parsed
          });
        }
        return parsed as ArcadeContentMap[T];
      }
    } catch (e) {
      console.warn("Arcade gen attempt failed:", e);
    }
  }

  // 3. Fallback
  return FALLBACKS.general[gameType] as ArcadeContentMap[T];
}
