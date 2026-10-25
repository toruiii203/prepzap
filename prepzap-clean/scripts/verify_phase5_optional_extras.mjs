import { spawn } from "child_process";
import puppeteer from "puppeteer";
import path from "path";

const PORT = 4187;
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

    // ── Test 1: Path Sparkles & Ambient Sound Toggle on Dashboard ──
    console.log("Testing 5A & 5B: Path Sparkles & Ambient Sound Toggle...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    const checkSparklesAndAmbient = await page.evaluate(() => {
      const sparkles = document.querySelectorAll(".animate-float-sparkle-1");
      const ambientBtn = document.querySelector("button[title*='focus rain']");
      return {
        hasSparkles: sparkles.length > 0,
        hasAmbientBtn: !!ambientBtn,
      };
    });
    console.log("Sparkles and Ambient Button:", checkSparklesAndAmbient);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase5_path_sparkles_and_ambient.png"),
      fullPage: false,
    });
    console.log("Saved phase5_path_sparkles_and_ambient.png");

    // ── Test 2: Ambient Sound Activation ──
    console.log("Clicking Ambient Sound button...");
    await page.evaluate(() => {
      const ambientBtn = document.querySelector("button[title*='focus rain']");
      if (ambientBtn) ambientBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const isAmbientActive = await page.evaluate(() => {
      return document.body.innerText.includes("Focus Rain: On");
    });
    console.log("Ambient sound toggled active:", isAmbientActive);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase5_ambient_sound_active.png"),
      fullPage: false,
    });
    console.log("Saved phase5_ambient_sound_active.png");

    // ── Test 3: Command Palette (Ctrl+K) ──
    console.log("Testing 5C: Command Palette (Ctrl+K)...");
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyK");
    await page.keyboard.up("Control");
    await new Promise((r) => setTimeout(r, 800));

    const cmdkOpened = await page.evaluate(() => {
      const modal = document.querySelector("[cmdk-root]");
      return !!modal || document.body.innerText.includes("QUICK STUDY ACTIONS");
    });
    console.log("Command palette opened:", cmdkOpened);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase5_command_palette.png"),
      fullPage: false,
    });
    console.log("Saved phase5_command_palette.png");

    await browser.close();
    console.log("Phase 5 verification successfully finished!");
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
