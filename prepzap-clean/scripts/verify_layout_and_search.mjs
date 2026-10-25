import { spawn } from "child_process";
import puppeteer from "puppeteer";
import path from "path";

const PORT = 4175;
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
    streak_days: 3,
    total_xp: 320,
    plan: "pro",
  },
  cachedAt: Date.now(),
};

// Exam target matching the user's screenshot
const mockPrefsWithExam = {
  name: "Miguel",
  subjects: ["math"],
  goal: "grades",
  learningStyles: ["mixed"],
  dailyGoalMinutes: 15,
  examTarget: {
    examTitle: "Mathematics",
    examDate: "2026-10-22", // concluded 3d ago as in user screenshot
    subject: "math",
    attachedSourceIds: [],
  },
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

async function main() {
  console.log(`Starting vite preview server on port ${PORT}...`);
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    shell: true,
  });

  const cleanup = () => {
    try {
      server.kill("SIGTERM");
    } catch {}
  };

  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  const ready = await waitForServer(BASE_URL);
  if (!ready) {
    console.error("Preview server failed to start.");
    cleanup();
    process.exit(1);
  }

  console.log("Server ready. Launching Puppeteer for visual audit verification...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument((mp, prefs) => {
      localStorage.setItem("pz_auth_cache", JSON.stringify(mp));
      localStorage.setItem("pz_tutorial_seen_/dashboard", "true");
      localStorage.setItem("pz_tutorial_seen_/practice", "true");
      localStorage.setItem("studenius_user_preferences", JSON.stringify(prefs));
      localStorage.setItem(`studenius_user_preferences_${mp.user.id}`, JSON.stringify(prefs));
      localStorage.setItem("pz_study_tools_collapsed", "false");
      localStorage.setItem("pz_path_map_collapsed", "false");
    }, mockProfile, mockPrefsWithExam);

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));

    // 1. Capture Dashboard with new layout (Search Bar & Tools top, fixed Exam Card)
    const dashboardPath = path.join(ARTIFACTS_DIR, "verified_dashboard_new_layout.png");
    await page.screenshot({ path: dashboardPath, fullPage: false });
    console.log(`Saved screenshot: ${dashboardPath}`);

    // 2. Click into Search Bar and type "bio" to trigger search queries guessing
    await page.click('input[placeholder*="Ask Rex anything"]');
    await new Promise((r) => setTimeout(r, 300));
    await page.keyboard.type("bio", { delay: 60 });
    await new Promise((r) => setTimeout(r, 600));

    const searchDropdownPath = path.join(ARTIFACTS_DIR, "verified_search_guessing.png");
    await page.screenshot({ path: searchDropdownPath, fullPage: false });
    console.log(`Saved screenshot: ${searchDropdownPath}`);

    // 3. Click the Hide Tools button
    const hideBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent && b.textContent.includes("Hide"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (hideBtn) {
      await new Promise((r) => setTimeout(r, 600));
      const collapsedPath = path.join(ARTIFACTS_DIR, "verified_tools_collapsed.png");
      await page.screenshot({ path: collapsedPath, fullPage: false });
      console.log(`Saved screenshot: ${collapsedPath}`);
    }

    console.log("All visual verifications captured successfully!");
  } finally {
    await browser.close();
    cleanup();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Puppeteer verification error:", err);
  process.exit(1);
});
