const fs = require('fs');
let code = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

// Add question to StudyPoint
code = code.replace(
  'interface StudyPoint {\n  label: string;\n  value: string;\n}',
  'interface StudyPoint {\n  label: string;\n  value: string;\n  question: string;\n}'
);

// Add required question parsing check
code = code.replace(
  'if (typeof p?.label !== "string" || !p.label.trim() || typeof p?.value !== "string" || !p.value.trim()) {',
  'if (typeof p?.label !== "string" || !p.label.trim() || typeof p?.value !== "string" || !p.value.trim() || typeof p?.question !== "string") {'
);

// Modify prompt
code = code.replace(
  /\{ "label": "Key Concept Name:", "value": "A complete deeply explanatory educational definition..." \},[\s\S]*\{ "label": "Fourth Concept Name:", "value": "Detailed fact explanation..." \}/,
  `{ "label": "Key Concept Name:", "value": "A complete deeply explanatory educational definition...", "question": "What is the core definition of...?" },
    { "label": "Second Concept Name:", "value": "Detailed fact explanation...", "question": "Why does...?" },
    { "label": "Third Concept Name:", "value": "Detailed fact explanation...", "question": "How does...?" },
    { "label": "Fourth Concept Name:", "value": "Detailed fact explanation...", "question": "What is the result of...?" }`
);

code = code.replace(
  /- tags: 2-4 short title-cased topic labels/,
  `- tags: 2-4 short title-cased topic labels\n- question: a specific retrieval-practice question to test the user's memory on this point\n- BOLDING: Wrap key terms in the 'value' field with **asterisks** so they can be bolded in the UI.`
);

fs.writeFileSync('src/pages/QuickStudy.tsx', code);
