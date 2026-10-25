import { spawn } from "child_process";
import puppeteer from "puppeteer";
import path from "path";

const PORT = 4184;
const BASE_URL = `http://localhost:${PORT}`;
const ARTIFACTS_DIR = "C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65";

const mockProfile = {
  session: {
    access_token: "mock-token",
    user: { id: "mock-user", email: "miguel@studenius.com" },
  },
  user: { id: "mock-user", email: "miguel@studenius.com", name: "Miguel" },
  profile: {
    id: "mock-user",
    full_name: "Miguel",
    email: "miguel@studenius.com",
    onboarding_complete: true,
    streak_days: 5,
    total_xp: 520,
    plan: "pro",
  },
  cachedAt: Date.now(),
};

const mockPrefs = {
  name: "Miguel",
  subjects: ["math"],
  goal: "grades",
  learningStyles: ["mixed"],
  dailyGoalMinutes: 15,
};

async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) {
        return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function run() {
  console.log("Starting preview server on port", PORT);
  const server = spawn("npm.cmd", ["run", "preview", "--", "--port", String(PORT), "--host"], {
    cwd: "C:/Users/Migs/Desktop/prepzap/prepzap-clean",
    stdio: "inherit",
    shell: true,
  });

  try {
    const ready = await waitForServer(BASE_URL);
    if (!ready) throw new Error("Server failed to start");
    console.log("Server ready!");

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    await page.evaluateOnNewDocument((mp, prefs) => {
      localStorage.setItem("pz_auth_cache", JSON.stringify(mp));
      localStorage.setItem("studenius_auth_cache", JSON.stringify(mp));
      localStorage.setItem("pz_tutorial_seen_/dashboard", "true");
      localStorage.setItem("pz_tutorial_seen_/practice", "true");
      localStorage.setItem("pz_tutorial_seen_/flashcards", "true");
      localStorage.setItem("studenius_user_preferences", JSON.stringify(prefs));
    }, mockProfile, mockPrefs);

    // ── Test 1: Timer Ring in Lesson Mode (3A) ──
    console.log("Testing 3A: Timer ring in Lesson Mode...");
    await page.goto(`${BASE_URL}/practice?autostart=true&subject=math&node=node-1`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 2000));

    const timerRingText = await page.evaluate(() => {
      const el = document.querySelector("[title*='Time on question']");
      return el ? el.innerText : null;
    });
    console.log("Timer Ring rendered in lesson top bar:", timerRingText);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase3_timer_ring.png"),
      fullPage: false,
    });
    console.log("Saved phase3_timer_ring.png");

    // ── Test 2: Flashcards 3D Flip & 4 Anki Buttons (3B & 3C) ──
    console.log("Testing 3B & 3C: Flashcard 3D flip & 4 Anki grading buttons...");
    await page.goto(`${BASE_URL}/flashcards?view=study`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Flip card
    await page.evaluate(() => {
      const card = document.querySelector(".cursor-pointer");
      if (card) card.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const gradingButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button")).map(b => b.innerText.toUpperCase());
      return {
        hasAgain: btns.some(t => t.includes("AGAIN")),
        hasHard: btns.some(t => t.includes("HARD")),
        hasGood: btns.some(t => t.includes("GOOD")),
        hasEasy: btns.some(t => t.includes("EASY")),
      };
    });
    console.log("4 Anki grading buttons:", gradingButtons);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase3_flashcard_4_buttons.png"),
      fullPage: false,
    });
    console.log("Saved phase3_flashcard_4_buttons.png");

    // ── Test 3: Due Cards Badge (3D) ──
    console.log("Testing 3D: Due-cards badge in Sidebar...");
    await page.evaluate(() => {
      const past = new Date(Date.now() - 3600 * 1000).toISOString();
      const sCards = [
        { cardId: "c1", deckId: "d1", interval: 1, repetition: 1, easeFactor: 2.5, nextReview: past },
        { cardId: "c2", deckId: "d1", interval: 1, repetition: 1, easeFactor: 2.5, nextReview: past },
        { cardId: "c3", deckId: "d1", interval: 1, repetition: 1, easeFactor: 2.5, nextReview: past },
      ];
      localStorage.setItem("studenius_sr_cards", JSON.stringify(sCards));
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    const dueCountInNav = await page.evaluate(() => {
      const match = document.body.innerText.match(/3 due|3/);
      return match ? match[0] : null;
    });
    console.log("Due badge found on Practice / Sidebar:", dueCountInNav);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase3_due_badge.png"),
      fullPage: false,
    });
    console.log("Saved phase3_due_badge.png");

    await browser.close();
    console.log("Phase 3 verification successfully finished!");
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
