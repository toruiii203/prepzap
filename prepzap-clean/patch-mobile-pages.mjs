#!/usr/bin/env node
// patch-mobile-pages.mjs
// Run from your project root: node patch-mobile-pages.mjs
//
// What this does to each page:
//   1. Wraps bare <Navbar /> in <div className="hidden md:block">
//   2. Adds a slim mobile top bar right after the Navbar wrapper
//   3. Adds <BottomNav /> import if missing
//   4. Adds <BottomNav /> before the closing root div

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SRC = join(process.cwd(), "src");

// [filePath relative to src/, mobile top bar title]
const PAGES = [
  ["pages/Practice.tsx",      "Practice"],
  ["pages/Flashcards.tsx",    "Flashcards"],
  ["pages/FocusTimer.tsx",    "Focus Timer"],
  ["pages/Analytics.tsx",     "Analytics"],
  ["pages/StudyPlanner.tsx",  "Study Planner"],
  ["pages/FeynmanMode.tsx",   "Feynman Mode"],
  ["pages/MathSolver.tsx",    "Math Solver"],
  ["pages/QuizBuilder.tsx",   "Quiz Builder"],
  ["pages/Settings.tsx",      "Settings"],
  ["pages/EssayWriter.tsx",   "Essay Writer"],
  ["pages/Community.tsx",     "Community"],
  ["pages/Suggestions.tsx",   "Suggestions"],
  ["pages/ToolArchitect.tsx", "Roadmap"],
  ["pages/SynthesisLab.tsx",  "Synthesis Lab"],
  ["pages/WhyEngine.tsx",     "Why Engine"],
  ["pages/UploadMaterials.tsx","Upload"],
  ["pages/Pricing.tsx",       "Pricing"],
];

const MOBILE_TOP_BAR = (title) => `
      {/* ── Mobile top bar (hidden on desktop) ── */}
      <div className="md:hidden flex items-center justify-between px-4 h-12 sticky top-0 z-40 bg-background border-b border-border">
        <span className="font-bold text-sm">${title}</span>
      </div>`;

let fixed = 0;
let skipped = 0;

for (const [rel, title] of PAGES) {
  const filePath = join(SRC, rel);

  if (!existsSync(filePath)) {
    console.log(`⚠️  Not found, skipping: ${rel}`);
    skipped++;
    continue;
  }

  let src = readFileSync(filePath, "utf8");
  const original = src;

  // ── 1. Add BottomNav import if missing ──
  if (!src.includes("BottomNav")) {
    // Insert after the last import line
    src = src.replace(
      /(^import .+\n)(?!import)/m,
      (match) => match + `import { BottomNav } from "@/components/BottomNav";\n`
    );
  }

  // ── 2. Wrap bare <Navbar ... /> in hidden md:block if not already done ──
  if (!src.includes('hidden md:block') && src.match(/<Navbar[\s/]/)) {
    src = src.replace(
      /(\s*)(<Navbar(?:\s[^>]*)?\s*\/>)/g,
      (_, indent, tag) =>
        `${indent}{/* Desktop Navbar — hidden on mobile */}\n${indent}<div className="hidden md:block">\n${indent}  ${tag}\n${indent}</div>${MOBILE_TOP_BAR(title)}`
    );
  }

  // ── 3. Add <BottomNav /> before the last </div> in the return if missing ──
  if (!src.includes("<BottomNav")) {
    const lastClose = src.lastIndexOf("</div>");
    if (lastClose !== -1) {
      src =
        src.slice(0, lastClose) +
        `\n      {/* Mobile bottom nav */}\n      <BottomNav />\n    ` +
        src.slice(lastClose);
    }
  }

  if (src !== original) {
    writeFileSync(filePath, src, "utf8");
    console.log(`✅ Patched: ${rel}`);
    fixed++;
  } else {
    console.log(`ℹ️  Already up to date: ${rel}`);
    skipped++;
  }
}

console.log(`\n✨ Done — ${fixed} file(s) patched, ${skipped} skipped.`);
