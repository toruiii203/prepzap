import { spawn } from "child_process";
import puppeteer from "puppeteer";
import path from "path";

const PORT = 4173;
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
    await page.evaluateOnNewDocument((mp) => {
      localStorage.setItem("pz_auth_cache", JSON.stringify(mp));
      localStorage.setItem("pz_tutorial_seen_/dashboard", "true");
      localStorage.setItem("pz_tutorial_seen_/practice", "true");
      localStorage.setItem(
        "studenius_user_prefs",
        JSON.stringify({
          name: "Miguel",
          subjects: ["Biology"],
          goal: "grades",
          learningStyles: ["mixed"],
          dailyGoalMinutes: 15,
        })
      );
    }, mockProfile);

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1000));

    // Click active node on desktop
    const activeNodeBtn = await page.$('button[aria-label*="Active Recall Sprint"]');
    if (activeNodeBtn) {
      await activeNodeBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      // Click START button
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const startBtn = btns.find((b) => b.textContent && b.textContent.includes("START"));
        if (startBtn) startBtn.click();
      });

      await new Promise((r) => setTimeout(r, 1500));

      // In the quiz, select the correct option ("Active retrieval practice")
      console.log("Selecting option in quiz...");
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const opt = btns.find((b) => b.textContent && b.textContent.includes("Active retrieval practice"));
        if (opt) opt.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      // Click CHECK ANSWER
      console.log("Clicking CHECK ANSWER...");
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const checkBtn = btns.find((b) => b.textContent && b.textContent.includes("CHECK ANSWER"));
        if (checkBtn) checkBtn.click();
      });
      await new Promise((r) => setTimeout(r, 1200));

      const feedbackPath = path.join(ARTIFACTS_DIR, "audit_duolingo_feedback.png");
      await page.screenshot({ path: feedbackPath, fullPage: false });
      console.log(`Saved feedback screenshot: ${feedbackPath}`);
    }

    console.log("All feedback test screenshots captured successfully!");
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
