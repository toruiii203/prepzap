import { spawn } from "child_process";
import puppeteer from "puppeteer";
import path from "path";

const PORT = 4179;
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
    streak_days: 4,
    total_xp: 450,
    plan: "pro",
  },
  cachedAt: Date.now(),
};

const mockPrefsWithExam = {
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
      localStorage.setItem("studenius_user_preferences", JSON.stringify(prefs));
      localStorage.setItem(`studenius_user_preferences_${mp.user.id}`, JSON.stringify(prefs));
      localStorage.setItem("pz_study_tools_collapsed", "false");
      localStorage.setItem("pz_path_map_collapsed", "false");
      localStorage.removeItem("pz_practice_queue");
      localStorage.removeItem("pz_practice_questions");
      localStorage.removeItem("pz_practice_mode");
    }, mockProfile, mockPrefsWithExam);

    // 1. First test: Autostart lesson direct route (Phase 0A & 0B)
    console.log("Navigating to /practice?autostart=true&subject=math&node=node-2");
    await page.goto(`${BASE_URL}/practice?autostart=true&subject=math&node=node-2`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Capture Lesson Shell
    console.log("Capturing phase0_lesson_shell.png...");
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase0_lesson_shell.png") });

    // 2. Select option A and Check (Phase 0C Feedback Bar)
    console.log("Selecting option and checking answer...");
    const buttons = await page.$$("main button");
    if (buttons.length > 0) {
      await buttons[0].click();
      await new Promise((r) => setTimeout(r, 500));

      // Click CHECK
      const allButtons = await page.$$("button");
      for (const btn of allButtons) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text && text.includes("CHECK")) {
          await btn.click();
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 800));

      console.log("Capturing phase0_feedback_bar.png...");
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase0_feedback_bar.png") });
    }

    // 3. Complete remaining questions to reach Victory Screen (Phase 0D)
    console.log("Completing lesson questions to trigger Victory Screen...");
    for (let i = 0; i < 7; i++) {
      // Click CONTINUE if feedback bar is visible
      const allBtns = await page.$$("button");
      let clickedContinue = false;
      for (const btn of allBtns) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text && text.includes("CONTINUE")) {
          await btn.click();
          clickedContinue = true;
          break;
        }
      }

      await new Promise((r) => setTimeout(r, 600));

      // If VictoryScreen rendered, break
      const victoryHeading = await page.$('[aria-label="Session Complete"]');
      if (victoryHeading) {
        console.log("Victory screen reached!");
        break;
      }

      // If a new question is waiting, answer it
      const optionButtons = await page.$$("main button");
      if (optionButtons.length > 0) {
        await optionButtons[0].click();
        await new Promise((r) => setTimeout(r, 300));
        const checkBtns = await page.$$("button");
        for (const btn of checkBtns) {
          const text = await page.evaluate(el => el.innerText, btn);
          if (text && text.includes("CHECK")) {
            await btn.click();
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    await new Promise((r) => setTimeout(r, 1200));
    console.log("Capturing phase0_victory_screen.png...");
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase0_victory_screen.png") });

    await browser.close();
    console.log("Phase 0 verification complete!");
  } finally {
    server.kill();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
