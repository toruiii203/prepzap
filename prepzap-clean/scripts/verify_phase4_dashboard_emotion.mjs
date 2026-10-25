import { spawn } from "child_process";
import puppeteer from "puppeteer";
import path from "path";

const PORT = 4186;
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
      localStorage.setItem("studenius_user_preferences", JSON.stringify(prefs));
    }, mockProfile, mockPrefs);

    // ── Test 1: Desktop Dashboard with Mastery Rings & Context Rex ──
    console.log("Testing 4A & 4B: Desktop Mastery Rings & Context-Aware Rex...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    const checkHeaderAndRings = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasMasteryTitle: text.includes("SUBJECT MASTERY"),
        hasSoCloseNudge: text.includes("So close!"),
        hasMathRing: text.includes("84%"),
        hasStreakGreeting: text.includes("5-Day Streak") || text.includes("on fire"),
      };
    });
    console.log("Desktop checks:", checkHeaderAndRings);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase4_mastery_and_context_rex.png"),
      fullPage: false,
    });
    console.log("Saved phase4_mastery_and_context_rex.png");

    // ── Test 2: Trigger Gentle Session Summary Card ──
    console.log("Testing 4C: Gentle Session Summary Card...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("studenius:session-summary", {
        detail: {
          minutes: 12,
          xpEarned: 45,
          streakDays: 5,
          toolName: "Flashcards",
          message: "That is a habit forming.",
        }
      }));
    });
    await new Promise((r) => setTimeout(r, 800));

    const sessionSummaryFound = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes("You studied for 12 minutes") && text.includes("That is a habit forming.");
    });
    console.log("Session summary card rendered:", sessionSummaryFound);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase4_session_summary_card.png"),
      fullPage: false,
    });
    console.log("Saved phase4_session_summary_card.png");

    await browser.close();
    console.log("Phase 4 verification successfully finished!");
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
