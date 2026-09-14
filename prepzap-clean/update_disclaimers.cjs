const fs = require('fs');

// MathSolver.tsx
let mathContent = fs.readFileSync('src/pages/MathSolver.tsx', 'utf8');
mathContent = mathContent.replace(
    'AI Solver can make mistakes. Verify important results with your textbook.',
    'Rex is a learning assistant, not an answer key. Double-check important facts with your course materials.'
);
fs.writeFileSync('src/pages/MathSolver.tsx', mathContent, 'utf8');

// AITutor.tsx (just replace the text directly for now, or import it. It's easier to just replace the text directly to match the style since it's already there)
let aiContent = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');
aiContent = aiContent.replace(
    'Studenius AI can make mistakes. Verify important academic concepts with your textbook.',
    'Rex is a learning assistant, not an answer key. Double-check important facts with your course materials.'
);
aiContent = aiContent.replace(
    'AI can make mistakes. Verify important concepts with your textbook.',
    'Rex is a learning assistant, not an answer key. Double-check important facts with your course materials.'
);
fs.writeFileSync('src/pages/AITutor.tsx', aiContent, 'utf8');

console.log("Updated disclaimers");
