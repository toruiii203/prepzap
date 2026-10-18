# Studenius: Core Design & Architectural Invariants

This document defines the strict architectural, UX, design, and storage rules for Studenius. All future contributions and agent workflows must adhere to these invariants.

---

## 1. Visual & Color System
- **Core Neobrutalism**: Pure black (`#000000` / `#1A1A1A`), pure white (`#FFFFFF`), solid borders (`border-2 border-black`), and sharp box shadows (`shadow-[2px_2px_0px_#000]`). Primary brand accents: `#FFD13B` (yellow) and `#FF4D2E` (coral).
- **No Pastel Washes**: Avoid washed-out mint green (`bg-emerald-50`), pale cyan (`bg-blue-50`), or muted teal for subject tags, cards, or backgrounds.
- **Allowed Semantic Colors**:
  - **Success / Correct**: Solid emerald (`#10B981` / `#059669`) with black borders.
  - **Error / Incorrect**: Solid rose/red (`#EF4444` / `#DC2626`).
  - **Active Filter / Badge**: High-contrast solid black (`bg-black text-white`) or brand accents.
  - **Gradients**: Limited strictly to brand accents (e.g. coral-to-yellow hero CTA buttons). Never use pastel or unbranded gradients.

---

## 2. Typography & Emoji Policy
- **UI Elements (Strict Zero-Emoji)**: Never use decorative emojis in headings, buttons, tabs, cards, or notifications (e.g., 📚, 📝, 💡, ⚡, ✨, 🧠, 🎯). Use Google Material Symbols Outlined.
- **Sparkle Icon Ban**: Do **NOT** use `auto_awesome` (sparkle icon), as users associate it with generic AI gimmicks.
- **Single UI Exemption**: The streak flame `🔥` is permitted solely for study streak counters.
- **User Content Exemption**: Users' own notes, flashcard content, bios, and nicknames may contain emojis. The application must never strip or corrupt user-entered emoji.

---

## 3. Copy & Content Authenticity
- **Plain Student Voice**: Short, humble, direct, encouraging copy. Avoid corporate buzzwords and marketing fluff ("engineered for retention", "supercharge your memory").
- **No "AI" Labels**: Do not prefix features with "AI" (use "Rex Tutor", "Rex Brain", or specific study actions like "Break it down", "Test me", "Summarize") unless technical transparency genuinely demands it.
- **Zero Invented Stats or Urgency**:
  - Never display fake social metrics (e.g., "846 Hearts", "12 Study Posts", "5x more likely to complete").
  - Real metrics only. Hide zero counts. If a bio is empty, leave it blank.

---

## 4. Storage & Offline Integrity
- **Client Storage Boundary**:
  - `localStorage` is capped at ~5MB: keep only lightweight preferences, streak metadata, and active draft states in `localStorage`.
  - Binary files (uploaded PDFs, syllabus docs) must be stored in IndexedDB (`idb`), **never** in `localStorage` and **never** in Supabase Storage buckets.
- **Device-Only Notice & Text-Only Sharing**:
  - Inform students clearly that local files remain on their current device/browser.
  - The universal share system (`/share/:type/:slug`) is strictly text-based (notes, flashcard decks, quizzes) so materials can be cloned without binary dependencies.

---

## 5. Deferred-Auth Architecture & Identity Boundaries
- **Value Before Auth**: Top-of-funnel onboarding must allow subject selection, exam goal setting, and a baseline active-recall win *before* requiring an account.
- **Returning User Protection**: Step 1 must always provide an "I already have an account / Log In" shortcut. If `profiles.onboarding_complete === true`, users must never be forced through onboarding again or have their profile overwritten.
- **Pre-Auth API Boundary**: Unauthenticated users must **never** trigger paid or rate-limited LLM endpoints. Baseline diagnostics must use pre-written, curated question banks.
- **Identity Exceptions**: Cloud features that inherently require user identity (adding friends, dueling, publishing to Campus Vault, cloud sync) strictly require authentication.

---

## 6. Process & Quality Safeguards
- **Error Boundaries**: Every major route must be wrapped in a resilient React error boundary to prevent full-app blank screens.
- **Smoke Testing**: Prior to shipping, run a clean production build (`npm run build`) and verify route integrity.
- **Accessibility & Motion**: Sound effects must always be accompanied by visual feedback. Include a mute toggle and respect `prefers-reduced-motion`.
