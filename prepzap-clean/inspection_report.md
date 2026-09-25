# Studenius Quality & Architecture Inspection

After conducting a comprehensive audit of the application's UI, security, AI architecture, and codebase, I have compiled this quality inspection report. The good news is that the core architecture is highly secure and scalable. However, there are a few critical limitations (especially in AI context handling and content moderation) that we should address to take the app from a "prototype" to a "production-ready" platform.

---

## 🔒 1. Security & Infrastructure Audit
**Status: EXCELLENT, WITH ONE GAP**

*   ✅ **API Key Security**: Flawless. You are correctly proxying Groq API calls through a Cloudflare Worker (`VITE_GROQ_PROXY_URL`). The secret key is never exposed to the client browser, completely eliminating the risk of API theft.
*   ✅ **Database Security (RLS)**: Row Level Security is active and properly scoped across `study_sessions`, `study_activity`, and `notes`. Users cannot query or mutate data belonging to other `user_id`s.
*   ⚠️ **The Gap — Content Moderation**: The profanity filter is currently a hardcoded 6-word array (`["fuck", "shit", ...]`) applied only to Arena room creation. 
    *   **The Risk**: Users can bypass this easily (e.g., using numbers or symbols) and can still inject inappropriate content into custom Usernames or publicly shared Flashcard sets.
    *   **The Fix**: Implement a robust library (like the `bad-words` npm package) and check all user-generated content server-side via a Supabase Edge Function before insertion.

## 🧠 2. AI Output & Context Management
**Status: FUNCTIONAL, BUT LIMITED**

*   ✅ **JSON Parsing**: The `safeParseJSON` utility effectively strips markdown fences and prevents the app from crashing when the LLM outputs conversational filler before the JSON object.
*   ⚠️ **The Gap — "The 5000-Character Wall"**: In `src/lib/sourceContext.ts`, the `buildAIContext()` function blindly truncates all uploaded PDFs/sources at 5,000 characters (about 2 pages of text). 
    *   **The Risk**: If a student uploads a 50-page biology PDF and asks a question about Chapter 4, the AI Tutor will physically not have the text in its context window. It will either hallucinate an answer or say it doesn't know.
    *   **The Fix (Project Omniscient Context)**: We need to implement **Retrieval-Augmented Generation (RAG)**. We enable the `pgvector` extension in Supabase. When a PDF is uploaded, we split it into 500-word chunks and store their mathematical embeddings. When a student asks a question, we instantly search the DB for the 3 most relevant paragraphs and feed *only* those to the AI.

## 📱 3. UI/UX & Bug Checking
**Status: SOLID, RECENTLY STABILIZED**

*   ✅ **Mobile Layouts**: The most fatal mobile bugs (like the `100dvh` virtual keyboard scrolling bug in AI Tutor and the missing dashboard stats) have been successfully neutralized today.
*   ✅ **Tutorial System**: The neobrutalist modal injection is now safely wrapping all 12 tools without crashing the TypeScript compiler.
*   ⚠️ **The Gap — Empty States**: While the Dashboard now correctly loads, an empty user account results in a massive, flat "Weekly Momentum" chart. We should inject friendly, illustrated empty states (e.g., Rex the Fox saying "Let's log your first session!") instead of rendering barren UI components.

---

## 🚀 Proposed Next Steps (The Backlog)

Since you mentioned we can implement anything I want to add, here are my top 4 recommendations for the next sprint, ordered by impact. **Which one would you like to tackle first?**

### Option A: The `[[` Note Linking Extension (Your Request)
Implement an Obsidian/Roam-style backlinking engine. When typing in Notes or Flashcards, typing `[[` opens an autocomplete menu of all other notes and sources. Hovering over a link in reading mode renders a preview tooltip of that note.

### Option B: True Document RAG (`pgvector`)
Shatter the 5,000-character wall. Set up Supabase `pgvector` so students can upload 100-page textbook PDFs and the AI Tutor can accurately cite, summarize, and quiz them on *any* page using vector similarity search.

### Option C: Adaptive Spaced Repetition (SM-2)
Currently, Flashcards just ask if you "Got it" or "Missed it". We can integrate the SuperMemo-2 cognitive science algorithm. The database will track `ease_factor` and `interval`, automatically calculating the exact date a student is about to forget a concept and scheduling it for review.

### Option D: Ironclad Integrity (Robust Profanity & Moderation)
Replace the hardcoded 6-word array with a comprehensive, maintained profanity filter that runs across Usernames, Arena Rooms, and any future social features, ensuring a safe academic environment.
