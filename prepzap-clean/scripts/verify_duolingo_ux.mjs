import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = "C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65";

async function run() {
  console.log("Launching Puppeteer for visual audit verification...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // 1. Audit Desktop Dashboard
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto("http://localhost:4173/dashboard", { waitUntil: "networkidle0" });
    await page.waitForSelector(".border-2", { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    const desktopPath = path.join(ARTIFACTS_DIR, "audit_duolingo_desktop.png");
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log(`Saved desktop dashboard screenshot: ${desktopPath}`);

    // 2. Audit Mobile Dashboard
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await page.goto("http://localhost:4173/dashboard", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1500));

    const mobilePath = path.join(ARTIFACTS_DIR, "audit_duolingo_mobile.png");
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log(`Saved mobile dashboard screenshot: ${mobilePath}`);

    // 3. Test 1-Tap Node Click -> Lesson Launch
    // Click active node on path
    const activeNodeBtn = await page.$('button[title*="Active Recall Sprint"]');
    if (activeNodeBtn) {
      await activeNodeBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      // Click START button in popover
      const startBtn = await page.$('button:has-text("START")');
      if (startBtn) {
        await startBtn.click();
      } else {
        // Double click launches directly
        await activeNodeBtn.click();
      }
      await new Promise((r) => setTimeout(r, 1200));

      const lessonPath = path.join(ARTIFACTS_DIR, "audit_duolingo_lesson.png");
      await page.screenshot({ path: lessonPath, fullPage: false });
      console.log(`Saved active lesson screenshot: ${lessonPath}`);
    }

    console.log("Visual audit verification completed successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Puppeteer verification error:", err);
  process.exit(1);
});
