export interface TutorialFeature {
  icon: string;
  title: string;
  desc: string;
  target?: string;
}

export const TUTORIAL_CONTENT: Record<string, TutorialFeature[]> = {
  "/dashboard": [
    { icon: "route", title: "Build a learning roadmap", desc: "Choose one topic or one file to plan chapters, explanations, practice and later review.", target: '[data-guide-target="new-roadmap"]' },
    { icon: "school", title: "Continue your learning", desc: "Open a saved roadmap to resume a chapter. Progress stays on this device for your account.", target: '[data-guide-target="learning-roadmaps"]' },
    { icon: "widgets", title: "Choose a study tool", desc: "Use the arrows or swipe to find practice, flashcards, notes and more.", target: '[data-study-tools-shelf] > div:first-child' }
  ],
  "/ai-tutor": [
    { icon: "forum", title: "Ask a question", desc: "Enter one question and use the explanation to work through the idea." },
    { icon: "school", title: "Learning Modes", desc: "Switch from simple ELI5 answers to challenging Socratic dialogue." },
    { icon: "history", title: "Session History", desc: "Review past conversations organized by time." }
  ],
  "/flashcards": [
    { icon: "style", title: "Your decks", desc: "Choose a saved deck or create cards from your study material." },
    { icon: "psychology", title: "Spaced Repetition", desc: "Focuses on the cards you struggle with the most." },
    { icon: "edit", title: "Custom Edits", desc: "Modify any card to suit your memory tricks." }
  ],
  "/practice": [
    { icon: "assignment", title: "Mock Exams", desc: "Enter a topic or use a source to set up a practice session.", target: 'textarea[placeholder^="Topic"],input[placeholder^="Topic"]' },
    { icon: "tune", title: "Mixed Formats", desc: "Combine multiple-choice, fill-in-the-blank, and identification." },
    { icon: "analytics", title: "Review the explanation", desc: "Check the feedback after answering and use it to revisit a difficult idea." }
  ],
  "/math": [
    { icon: "calculate", title: "Step-by-Step", desc: "Get detailed breakdowns of complex math problems." },
    { icon: "functions", title: "Formula Recognition", desc: "Supports advanced equations and symbolic math." },
    { icon: "draw", title: "Scratchpad", desc: "Work out the problem before checking the solution." }
  ],
  "/teach-it": [
    { icon: "record_voice_over", title: "Feynman Technique", desc: "Learn by teaching the concept back to Pip." },
    { icon: "gavel", title: "Constructive Critique", desc: "Compare the feedback with your explanation and try the idea again." },
    { icon: "mic", title: "Voice Input", desc: "Use voice input when your browser supports it, or type your explanation instead." }
  ],
  "/quick-study": [
    { icon: "bolt", title: "One focused topic", desc: "Enter a topic or use your material to create a focused study summary." },
    { icon: "priority_high", title: "Key Concepts", desc: "Strips out the fluff, focusing only on core ideas." },
    { icon: "timer", title: "Keep it focused", desc: "Choose one topic and work through the key points before moving on." }
  ],
  "/planner": [
    { icon: "track_changes", title: "Skill Goals", desc: "Track mastery of specific topics over time." },
    { icon: "calendar_month", title: "Visual Progress", desc: "See your daily completion donuts." },
    { icon: "insights", title: "Data Driven", desc: "Goals auto-calculate based on your real study data." }
  ],
  "/arena": [
    { icon: "assignment", title: "Daily challenge", desc: "Review today’s quiz and start an attempt when you are ready.", target: '[data-guide-target="daily-challenge"]' },
    { icon: "leaderboard", title: "Daily leaderboard", desc: "Switch between today’s results and the all-time view.", target: '[data-guide-target="daily-leaderboard"]' },
    { icon: "swords", title: "Rooms are in Live battles", desc: "Create or join a room from Live battles. Your existing room links still work.", target: '[data-guide-target="live-battles"]' }
  ],
  "/sources": [
    { icon: "upload_file", title: "Upload Anything", desc: "Add PDFs, docs, or paste raw text." },
    { icon: "memory", title: "Context Engine", desc: "Powers flashcards, quizzes, and tutor sessions with your course materials." },
    { icon: "search", title: "Smart Search", desc: "Find concepts across all your uploaded documents." }
  ],
  "/mistakes": [
    { icon: "auto_stories", title: "Error Log", desc: "Automatically tracks questions you get wrong." },
    { icon: "psychology_alt", title: "Pattern Analysis", desc: "Compare the explanation with your notes to understand the gap." },
    { icon: "fitness_center", title: "Targeted Practice", desc: "Choose an idea to revisit, then use practice to test your understanding." }
  ],
  "/analytics": [
    { icon: "bar_chart", title: "Study Trends", desc: "Visualize your focus and performance over time." },
    { icon: "trending_up", title: "XP Tracking", desc: "Monitor your overall Studenius level." },
    { icon: "timeline", title: "Subject Breakdown", desc: "See which topics need more attention." }
  ]

  ,
  "/notes": [
    { icon: "edit_document", title: "Rich Text Editor", desc: "Find a saved note or start a new one to collect your ideas.", target: 'input[placeholder="Search notes or concepts..."]' },
    { icon: "add_link", title: "Smart Linking", desc: "Type '[[' to instantly link other notes or sources." },
    { icon: "hub", title: "Knowledge Graph", desc: "Visualize connections between your ideas in real-time." }
  ],
  "/arcade": [
    { icon: "stadia_controller", title: "Mini-Games", desc: "Turn your study materials into playable games." },
    { icon: "memory", title: "Choose your material", desc: "Select the source or topic you want to practise before starting a game." },
    { icon: "emoji_events", title: "Quest Integration", desc: "Playing games counts towards your daily quests." }
  ],
};


// Targets are real controls; a guide falls back to a centered card when a control
// is not present in the current page state (for example, an empty library).
const firstTargets:Record<string,string>={
 "/ai-tutor":'textarea[placeholder*="Ask Pip"],textarea[placeholder*="Message"]',
 "/flashcards":'textarea[placeholder*="Cellular Respiration"],input[placeholder*="Nucleophilic"]',
 "/math":'textarea[placeholder*="math formula"],input[placeholder*="math formula"]',
 "/teach-it":'textarea[placeholder*="Quantum"],input[placeholder*="Quantum"],input[placeholder*="Action Potentials"]',
 "/quick-study":'textarea[placeholder*="Paste complex lecture"],input[placeholder*="Action Potentials"]',
 "/planner":'input[placeholder="Quick add topic / session note..."]',
 "/sources":'input[placeholder="Search your sources..."],input[placeholder="Search files..."]',
 "/mistakes":'input[placeholder="Search mistakes..."]',
 "/analytics":'[aria-label="Study totals"]',
};
for(const [page,target] of Object.entries(firstTargets)){if(TUTORIAL_CONTENT[page]?.[0])TUTORIAL_CONTENT[page][0]={...TUTORIAL_CONTENT[page][0],target};}
TUTORIAL_CONTENT["/visual-learner"]=[
 {icon:"draw",title:"Choose one idea",desc:"Enter the topic you want to understand visually.",target:'textarea[placeholder*="Artificial Intelligence"],input[placeholder*="Artificial Intelligence"]'},
 {icon:"account_tree",title:"Explore the connections",desc:"Use the visual view to connect the main ideas, then revisit the explanation."},
 {icon:"menu_book",title:"Bring your own material",desc:"Use Source Library when you want your course material to guide the work."},
];
