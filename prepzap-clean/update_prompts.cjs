const fs = require('fs');
let content = fs.readFileSync('src/lib/arcadePipeline.ts', 'utf8');

// Update PROMPTS
const promptsTarget = 'termle: "Generate a JSON array of exactly 5 objects with keys \'word\' (string, exactly 5 letters, ONLY letters, UPPERCASE) and \'hint\' (string, under 10 words) based on the following content. Ensure the word is a valid English word and strongly relevant to the topic."\n};';
const promptsReplacement = `termle: "Generate a JSON array of exactly 5 objects with keys 'word' (string, exactly 5 letters, ONLY letters, UPPERCASE) and 'hint' (string, under 10 words) based on the following content. Ensure the word is a valid English word and strongly relevant to the topic.",
  anagram_sprint: "",
  whack_a_mole: "Generate a JSON array of 10-15 objects with keys 'question' (string), 'correctAnswer' (string), and 'wrongAnswers' (array of exactly 3 strings). Base this on the provided content. Make sure questions are concise and answers are short.",
  odd_one_out: "Generate a JSON array of 8-10 objects with keys 'items' (array of exactly 4 strings), 'oddIndex' (integer between 0 and 3 indicating which item does not belong), and 'reason' (string briefly explaining why it is the odd one out). Base this on the provided content."
};`;
content = content.replace(promptsTarget, promptsReplacement);

// Update validateResult
const valTarget = 'if (type === "termle") {';
const valReplacement = `if (type === "whack_a_mole") {
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
  if (type === "termle") {`;
content = content.replace(valTarget, valReplacement);

fs.writeFileSync('src/lib/arcadePipeline.ts', content, 'utf8');
