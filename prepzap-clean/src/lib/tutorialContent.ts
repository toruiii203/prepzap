export interface TutorialFeature {
  icon: string;
  title: string;
  desc: string;
}

export const TUTORIAL_CONTENT: Record<string, TutorialFeature[]> = {
  "/dashboard": [
    { icon: "donut_large", title: "Daily Goals", desc: "Close your rings by hitting study time and XP targets." },
    { icon: "local_fire_department", title: "Streak Tracker", desc: "Build momentum by studying consecutive days." },
    { icon: "widgets", title: "Quick Tools", desc: "Jump straight into your favorite study modes." }
  ],
  "/ai-tutor": [
    { icon: "forum", title: "Rex Chat", desc: "Ask questions and get personalized explanations." },
    { icon: "school", title: "Learning Modes", desc: "Switch from simple ELI5 answers to challenging Socratic dialogue." },
    { icon: "history", title: "Session History", desc: "Review past conversations organized by time." }
  ],
  "/flashcards": [
    { icon: "style", title: "Smart Decks", desc: "AI-generated flashcards based on your source materials." },
    { icon: "psychology", title: "Spaced Repetition", desc: "Focuses on the cards you struggle with the most." },
    { icon: "edit", title: "Custom Edits", desc: "Modify any card to suit your memory tricks." }
  ],
  "/practice": [
    { icon: "assignment", title: "Mock Exams", desc: "Generate full quizzes to test your overall knowledge." },
    { icon: "tune", title: "Mixed Formats", desc: "Combine multiple-choice, fill-in-the-blank, and identification." },
    { icon: "analytics", title: "Detailed Feedback", desc: "Get AI scoring and explanations for incorrect answers." }
  ],
  "/math": [
    { icon: "calculate", title: "Step-by-Step", desc: "Get detailed breakdowns of complex math problems." },
    { icon: "functions", title: "Formula Recognition", desc: "Supports advanced equations and symbolic math." },
    { icon: "draw", title: "Scratchpad", desc: "Work out the problem before checking the solution." }
  ],
  "/teach-it": [
    { icon: "record_voice_over", title: "Feynman Technique", desc: "Learn by teaching the concept back to Rex." },
    { icon: "gavel", title: "Constructive Critique", desc: "Rex will point out gaps in your explanation." },
    { icon: "mic", title: "Voice Input", desc: "Explain concepts naturally using your microphone." }
  ],
  "/quick-study": [
    { icon: "bolt", title: "Cram Mode", desc: "High-yield, 5-minute review sessions." },
    { icon: "priority_high", title: "Key Concepts", desc: "Strips out the fluff, focusing only on core ideas." },
    { icon: "timer", title: "Time Boxed", desc: "Keeps you focused with a strict countdown." }
  ],
  "/planner": [
    { icon: "track_changes", title: "Skill Goals", desc: "Track mastery of specific topics over time." },
    { icon: "calendar_month", title: "Visual Progress", desc: "See your daily completion donuts." },
    { icon: "insights", title: "Data Driven", desc: "Goals auto-calculate based on your real study data." }
  ],
  "/arena": [
    { icon: "sports_esports", title: "Live Matches", desc: "Compete against friends in real-time." },
    { icon: "leaderboard", title: "Global Ranks", desc: "Climb the leaderboard with the Daily Quiz." },
    { icon: "diversity_3", title: "Custom Rooms", desc: "Host private rooms with your own study material." }
  ],
  "/sources": [
    { icon: "upload_file", title: "Upload Anything", desc: "Add PDFs, docs, or paste raw text." },
    { icon: "memory", title: "Context Engine", desc: "Powers all AI tools with your specific materials." },
    { icon: "search", title: "Smart Search", desc: "Find concepts across all your uploaded documents." }
  ],
  "/mistakes": [
    { icon: "auto_stories", title: "Error Log", desc: "Automatically tracks questions you get wrong." },
    { icon: "psychology_alt", title: "Pattern Analysis", desc: "Identifies why you made the mistake." },
    { icon: "fitness_center", title: "Targeted Practice", desc: "Generates new questions targeting weak spots." }
  ],
  "/analytics": [
    { icon: "bar_chart", title: "Study Trends", desc: "Visualize your focus and performance over time." },
    { icon: "trending_up", title: "XP Tracking", desc: "Monitor your overall Studenius level." },
    { icon: "timeline", title: "Subject Breakdown", desc: "See which topics need more attention." }
  ]

  ,
  "/arcade": [
    { icon: "stadia_controller", title: "Mini-Games", desc: "Turn your study materials into playable games." },
    { icon: "memory", title: "AI Generated", desc: "Games are custom-built from your active source." },
    { icon: "emoji_events", title: "Quest Integration", desc: "Playing games counts towards your daily quests." }
  ],
};
