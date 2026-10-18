import { spawn } from "child_process";
import puppeteer from "puppeteer";

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES = [
  { path: "/landing", auth: false },
  { path: "/onboarding", auth: false },
  { path: "/privacy", auth: false },
  { path: "/terms", auth: false },
  { path: "/dashboard", auth: true },
  { path: "/practice", auth: true },
  { path: "/flashcards", auth: true },
  { path: "/community", auth: true },
  { path: "/campus-vault", auth: true },
  { path: "/notes", auth: true },
  { path: "/math", auth: true },
  { path: "/settings", auth: true },
];

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
    stdio: "inherit",
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

  console.log("Server ready. Launching headless browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let failed = false;

  const mockProfile = {
    session: {
      access_token: "mock-token",
      user: { id: "mock-user", email: "student@studenius.test" },
    },
    user: { id: "mock-user", email: "student@studenius.test" },
    profile: {
      id: "mock-user",
      full_name: "Test Student",
      email: "student@studenius.test",
      onboarding_complete: true,
      streak_days: 1,
      total_xp: 100,
      plan: "free",
    },
    cachedAt: Date.now(),
  };

  try {
    for (const r of ROUTES) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      const pageErrors = [];

      page.on("pageerror", (err) => {
        const msg = err.message || String(err);
        // Exclude network offline errors or benign browser observer events
        if (
          !msg.includes("NetworkError") &&
          !msg.includes("Failed to fetch") &&
          !msg.includes("ResizeObserver")
        ) {
          pageErrors.push(msg);
        }
      });

      if (r.auth) {
        await page.evaluateOnNewDocument((mp) => {
          localStorage.setItem("pz_auth_cache", JSON.stringify(mp));
        }, mockProfile);
      } else {
        await page.evaluateOnNewDocument(() => {
          localStorage.removeItem("pz_auth_cache");
        });
      }

      const url = `${BASE_URL}${r.path}`;
      console.log(`Checking route: ${r.path}...`);
      const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 }).catch((e) => {
        console.warn(`Navigation notice for ${r.path}:`, e.message);
        return null;
      });

      // Verify the page actually rendered content and didn't crash
      const rootHtml = await page.$eval("#root", (el) => el.innerHTML).catch(() => "");
      const isBlank = !rootHtml || rootHtml.trim() === "";

      if (response && response.status() >= 400) {
        console.error(`FAIL: ${r.path} returned HTTP ${response.status()}`);
        failed = true;
      } else if (pageErrors.length > 0) {
        console.error(`FAIL: ${r.path} encountered runtime exceptions:`, pageErrors);
        failed = true;
      } else if (isBlank) {
        console.error(`FAIL: ${r.path} rendered blank root element`);
        failed = true;
      } else {
        console.log(`PASS: ${r.path}`);
      }

      await page.close();
    }
  } catch (err) {
    console.error("Smoke test unexpected error:", err);
    failed = true;
  } finally {
    await browser.close();
    cleanup();
  }

  if (failed) {
    console.error("\nSmoke test FAILED. Review errors above.");
    process.exit(1);
  } else {
    console.log("\nAll routes passed smoke test successfully with 0 runtime errors and 0 404s!");
    process.exit(0);
  }
}

main();
