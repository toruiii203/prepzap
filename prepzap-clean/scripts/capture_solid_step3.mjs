import puppeteer from 'puppeteer';
import path from 'path';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2 });

  // Navigate to preview server on 4173 (we will run preview server or open file directly)
  // Let's set draft in localStorage to be at Step 3
  await page.goto('http://localhost:4173/onboarding', { waitUntil: 'networkidle0' });

  // Select first subject
  const subjectBtn = await page.$('main button');
  if (subjectBtn) await subjectBtn.click();

  // Wait 1s
  await new Promise(r => setTimeout(r, 1000));

  // Now tap Start 1-Min Warm-Up
  const startBtn = await page.$('main button[class*="bg-[#FF4D2E]"]');
  if (startBtn) await startBtn.click();

  // Wait for Step 2 question choices
  await page.waitForSelector('main button', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 800));

  // Answer question (click first choice)
  const choices = await page.$$('main button');
  if (choices.length > 0) {
    await choices[0].click();
  }

  // Wait 1.5s for Step 3 Streak Celebration to mount and animate
  await new Promise(r => setTimeout(r, 2000));

  const screenshotPath = 'C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65/verified_solid_rex_step3.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
