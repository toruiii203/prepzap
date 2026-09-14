const fs = require('fs');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

replaceInFile('src/components/BottomNav.tsx', [
    ['smart_toy', 'forum'],
    ['AI Tutor', 'Rex Tutor']
]);

replaceInFile('src/pages/AITutor.tsx', [
    ['REX: AI TUTOR', 'REX: TUTOR'],
    ['>AI Tutor<', '>Rex Tutor<'],
    ['Message AI Tutor...', 'Message Rex...']
]);

replaceInFile('src/pages/Arena.tsx', [
    ['bolt', 'edit_document']
]);

replaceInFile('src/pages/ArenaResults.tsx', [
    ['bolt', 'edit_document']
]);

replaceInFile('src/components/OnboardingTour.tsx', [
    ['Your AI Tutor', 'Your Rex Tutor']
]);

replaceInFile('src/components/QuickLaunchBar.tsx', [
    ['AI Tutor', 'Rex Tutor']
]);

replaceInFile('src/pages/MistakeJournal.tsx', [
    ['bolt', 'lightbulb'],
    ['auto_awesome', 'edit_document']
]);

replaceInFile('src/pages/Landing.tsx', [
    ['AI tutor', 'Rex tutor']
]);

replaceInFile('src/pages/Settings.tsx', [
    ['bolt', 'military_tech'] // XP icon
]);

replaceInFile('src/pages/UsePro.tsx', [
    ['Unlimited Real-Time AI Tutor', 'Unlimited Real-Time Rex Tutor'],
    ['AI Tutor (Limited daily token usage)', 'Rex Tutor (Limited daily token usage)']
]);

console.log("Secondary replacements complete");
