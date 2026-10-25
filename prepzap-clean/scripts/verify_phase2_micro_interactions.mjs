import { spawn } from "child_process";
import puppeteer from "puppeteer";
import path from "path";

const PORT = 4182;
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

    // Mock Date.prototype.getHours to return 21 (9:00 PM) to trigger Streak Risk Banner
    await page.evaluateOnNewDocument((mp, prefs) => {
      localStorage.setItem("pz_auth_cache", JSON.stringify(mp));
      localStorage.setItem("studenius_auth_cache", JSON.stringify(mp));
      localStorage.setItem("pz_tutorial_seen_/dashboard", "true");
      localStorage.setItem("studenius_user_preferences", JSON.stringify(prefs));
      localStorage.setItem("pz_study_tools_collapsed", "false");
      localStorage.setItem("pz_path_map_collapsed", "false");
      sessionStorage.clear();

      // Mock getHours() to return 21 (9 PM)
      const origGetHours = Date.prototype.getHours;
      Date.prototype.getHours = function() {
        return 21;
      };
    }, mockProfile, mockPrefs);

    // 1. Visit Dashboard at 9 PM without studying today
    console.log("Visiting dashboard to test StreakRiskBanner (simulated 9 PM)...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));

    console.log("Capturing phase2_streak_risk_banner.png...");
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase2_streak_risk_banner.png") });

    // 2. Click "Save Streak" button on the banner
    console.log("Clicking Save Streak button on banner...");
    const allButtons = await page.$$("button");
    for (const btn of allButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Save Streak")) {
        await btn.click();
        break;
      }
    }

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 5000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));

    // 3. Test Combo Burst on Practice (Answer 3 questions correctly)
    console.log("Answering questions to build 3+ streak combo burst...");
    for (let q = 0; q < 3; q++) {
      // Find options
      const options = await page.$$("main button");
      if (options.length > 0) {
        // Option A is correct for pre-built math questions in lessonLauncher
        await options[0].click();
        await new Promise((r) => setTimeout(r, 400));

        // Click CHECK
        const checkBtns = await page.$$("button");
        for (const btn of checkBtns) {
          const text = await page.evaluate(el => el.innerText, btn);
          if (text && text.includes("CHECK")) {
            await btn.click();
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 600));

        // On question 3, capture the Combo Burst screenshot
        if (q === 2) {
          console.log("Capturing phase2_combo_burst.png on 3rd correct answer...");
          await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase2_combo_burst.png") });
        }

        // Click CONTINUE
        const contBtns = await page.$$("button");
        for (const btn of contBtns) {
          const text = await page.evaluate(el => el.innerText, btn);
          if (text && text.includes("CONTINUE")) {
            await btn.click();
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    await browser.close();
    console.log("Phase 2 verification complete!");
  } finally {
    server.kill();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
