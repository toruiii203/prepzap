import { spawn } from "child_process";
import puppeteer from "puppeteer";
import path from "path";

const PORT = 4181;
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

    // 1. Desktop Verification (1440x900)
    console.log("Verifying Desktop Layout & Simplified 5-Destination Sidebar...");
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1440, height: 900 });

    await desktopPage.evaluateOnNewDocument((mp, prefs) => {
      localStorage.setItem("pz_auth_cache", JSON.stringify(mp));
      localStorage.setItem("studenius_auth_cache", JSON.stringify(mp));
      localStorage.setItem("pz_tutorial_seen_/dashboard", "true");
      localStorage.setItem("studenius_user_preferences", JSON.stringify(prefs));
      localStorage.setItem("pz_study_tools_collapsed", "false");
      localStorage.setItem("pz_path_map_collapsed", "false");
      localStorage.setItem("pz_sidebar_more_open", "false");
    }, mockProfile, mockPrefs);

    await desktopPage.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));

    console.log("Capturing phase1_desktop_hierarchy.png...");
    await desktopPage.screenshot({ path: path.join(ARTIFACTS_DIR, "phase1_desktop_hierarchy.png") });

    // Click "More Tools" in sidebar to verify accordion expansion
    console.log("Expanding More Tools in sidebar...");
    const moreBtn = await desktopPage.$('button[aria-expanded]');
    if (moreBtn) {
      await moreBtn.click();
      await new Promise((r) => setTimeout(r, 600));
      console.log("Capturing phase1_desktop_more_tools.png...");
      await desktopPage.screenshot({ path: path.join(ARTIFACTS_DIR, "phase1_desktop_more_tools.png") });
    }

    // 2. Mobile Verification (390x844 - iPhone 14 / modern iOS)
    console.log("Verifying Mobile 390px Viewport...");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await mobilePage.evaluateOnNewDocument((mp, prefs) => {
      localStorage.setItem("pz_auth_cache", JSON.stringify(mp));
      localStorage.setItem("studenius_auth_cache", JSON.stringify(mp));
      localStorage.setItem("pz_tutorial_seen_/dashboard", "true");
      localStorage.setItem("studenius_user_preferences", JSON.stringify(prefs));
      localStorage.setItem("pz_study_tools_collapsed", "false");
      localStorage.setItem("pz_path_map_collapsed", "false");
    }, mockProfile, mockPrefs);

    await mobilePage.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));

    console.log("Capturing phase1_mobile_dashboard.png...");
    await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, "phase1_mobile_dashboard.png") });

    await browser.close();
    console.log("Phase 1 verification complete!");
  } finally {
    server.kill();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
