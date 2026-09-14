const fs = require('fs');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

// 1. Practice.tsx
replaceInFile('src/pages/Practice.tsx', [
    ['AI Quiz Builder', 'Quiz Generator'],
    ['smart_toy', 'school'],
    ['auto_awesome', 'edit_document']
]);

// 2. Flashcards.tsx
replaceInFile('src/pages/Flashcards.tsx', [
    ['New AI Deck', 'Generate Deck'],
    ['auto_awesome', 'style'],
    ['bolt', 'layers']
]);

// 3. QuickStudy.tsx
replaceInFile('src/pages/QuickStudy.tsx', [
    ['auto_awesome', 'summarize'],
    ['bolt', 'edit_note'],
    ['Generate Notes via AI', 'Generate Notes']
]);

// 4. TeachIt.tsx
replaceInFile('src/pages/TeachIt.tsx', [
    ['AI TUTOR: ACTIVE', 'REX: ACTIVE'],
    ['smart_toy', 'forum'],
    ['bolt', 'school']
]);

// 5. Global Nav & Hubs
const navFiles = [
    'src/pages/Dashboard.tsx',
    'src/components/SharedSidebar.tsx',
    'src/pages/SourceLibrary.tsx',
    'src/components/MobileBottomNav.tsx',
    'src/components/CommandPalette.tsx',
    'src/pages/ToolsHub.tsx',
    'src/pages/Landing.tsx',
    'src/pages/StudeniusLayout.tsx',
    'src/pages/Challenges.tsx',
    'src/pages/OnboardingFlow.tsx'
];

navFiles.forEach(file => {
    replaceInFile(file, [
        ['AI Tutor', 'Rex Tutor'],
        ['smart_toy', 'forum'],
        ['robot_2', 'forum'],
        ['bolt', 'edit_note'] // Generic replacement for quick study / flashcards actions in nav
    ]);
});

// 6. KnowledgeBaseChat.tsx
replaceInFile('src/components/KnowledgeBaseChat.tsx', [
    ['🧠', '📚'],
    ['Hi! I am your Knowledge Base AI. I have access to all your notes. Ask me anything!', 'Rex is ready. Ask questions based on your notes.']
]);

console.log("Global replacements complete");
