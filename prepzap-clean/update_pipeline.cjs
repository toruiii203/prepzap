const fs = require('fs');
let content = fs.readFileSync('src/lib/arcadePipeline.ts', 'utf8');

// 1. Update ArcadeGameType
content = content.replace(
  /export type ArcadeGameType = "memory_match" \| "true_false" \| "termle";/,
  'export type ArcadeGameType = "memory_match" | "true_false" | "termle" | "anagram_sprint" | "whack_a_mole" | "odd_one_out";'
);

// 2. Add new interfaces
const interfaces = `
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
`;
if (!content.includes('WhackAMoleQuestion')) {
  content = content.replace(/export interface TermleWord[^}]+}/, match => match + '\n' + interfaces);
}

// 3. Update ArcadeContentMap
content = content.replace(
  /termle: TermleWord\[\];\n};/,
  'termle: TermleWord[];\n  anagram_sprint: TermleWord[];\n  whack_a_mole: WhackAMoleQuestion[];\n  odd_one_out: OddOneOutRound[];\n};'
);

// 4. Update Fallbacks
const fallbackData = `
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
`;
if (!content.includes('whack_a_mole: [')) {
  content = content.replace(
    /termle: \[[^\]]+\]\n  \}/,
    match => match.slice(0, -2) + ',' + fallbackData + '  }'
  );
}

fs.writeFileSync('src/lib/arcadePipeline.ts', content, 'utf8');
