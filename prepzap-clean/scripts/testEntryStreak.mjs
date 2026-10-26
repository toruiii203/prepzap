import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { fixtureProfile, seedBrowser } from './uiFixtures.mjs';

const server = spawn('npm', ['exec', '--', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4188', '--strictPort'], { stdio: 'ignore', detached: true });
let browser;
const results = [];
mkdirSync('.agent/entry-streak', { recursive: true });
async function prepare(page, { theme = 'light', owner = fixtureProfile.id, tutorial = false } = {}) {
  await seedBrowser(page, { theme });
  await page.evaluateOnNewDocument((userId, showTutorial) => {
    localStorage.setItem('pz_study_sessions', JSON.stringify([{ id: 'entry-fixture', user_id: userId, created_at: new Date(Date.now() - 60_000).toISOString(), duration_minutes: 5 }]));
    if (!showTutorial) localStorage.setItem('pz_tutorial_seen_/dashboard', 'true');
  }, owner, tutorial);
}
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch('http://127.0.0.1:4188')).ok) break; } catch { /* Startup only. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  for (const scenario of [
    { width: 390, height: 844, theme: 'light', reduced: false },
    { width: 390, height: 844, theme: 'dark', reduced: false },
    { width: 320, height: 568, theme: 'light', reduced: true },
    { width: 844, height: 390, theme: 'dark', reduced: true },
  ]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: scenario.width, height: scenario.height, isMobile: true, hasTouch: true });
    if (scenario.reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await prepare(page, scenario);
    await page.goto('http://127.0.0.1:4188/dashboard', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-entry-streak-popup]');
    assert.equal(await page.$eval('[data-layer=shadow]', element => element.getAttribute('opacity')), '0');
    assert.equal(await page.$$eval('[data-entry-streak-popup] [data-confirmed=true]', elements => elements.length), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.$eval('[data-entry-streak-popup]', element => element.getBoundingClientRect().top >= 0 && element.getBoundingClientRect().bottom <= innerHeight), true);
    assert.equal(await page.$eval('body', element => getComputedStyle(element).pointerEvents !== 'none'), true, 'Optional popup blocked the page');
    assert.equal(await page.$eval('[aria-label="Dismiss streak update"]', element => element === document.activeElement), true);
    if (scenario.reduced) assert.equal(await page.$$eval('[data-entry-streak-popup] .seedling-art *', elements => elements.filter(element => getComputedStyle(element).animationName !== 'none').length), 0);
    await page.screenshot({ path: `.agent/entry-streak/${scenario.theme}-${scenario.width}.png`, fullPage: true });
    if (scenario.width === 390) await (await page.$('[data-entry-streak-popup]')).screenshot({ path: `design/seedling/review/entry-streak-${scenario.theme}.png` });
    if (scenario.width === 390 && scenario.theme === 'light') {
      // An outside navigation action must work while the panel is open.
      await page.click('nav[aria-label="Mobile Navigation"] button[aria-label="Practice"]');
      await page.waitForFunction(() => location.pathname === '/practice' && !document.querySelector('[data-entry-streak-popup]'));
    } else if (scenario.width === 390 && scenario.theme === 'dark') {
      await page.evaluate(() => {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog'); dialog.id = 'fixture-competing-dialog';
        document.body.append(dialog);
      });
      await page.waitForFunction(() => !document.querySelector('[data-entry-streak-popup]'));
      await page.evaluate(() => document.getElementById('fixture-competing-dialog').remove());
      results.push({ check: 'yields to a newly opened dialog', result: 'passed' });
    } else {
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('[data-entry-streak-popup]'));
    }
    await page.goto('http://127.0.0.1:4188/dashboard', { waitUntil: 'networkidle0' });
    assert.equal(await page.$('[data-entry-streak-popup]'), null, 'Popup repeated after reload');
    assert.deepEqual(errors, []);
    results.push({ ...scenario, result: 'passed' });
    await context.close();
  }
  // Two real tabs share a ledger and Web Lock, but separate runtime queues.
  {
    const context = await browser.createBrowserContext();
    const first = await context.newPage(); await prepare(first);
    await first.goto('http://127.0.0.1:4188/dashboard', { waitUntil: 'networkidle0' });
    await first.waitForSelector('[data-entry-streak-popup]');
    const second = await context.newPage(); await prepare(second);
    await second.goto('http://127.0.0.1:4188/dashboard', { waitUntil: 'networkidle0' });
    await second.bringToFront();
    assert.equal(await second.$('[data-entry-streak-popup]'), null);
    assert.notEqual(await first.$('[data-entry-streak-popup]'), null);
    results.push({ check: 'cross-tab daily cap', result: 'passed' });
    await context.close();
  }
  {
    const context = await browser.createBrowserContext();
    const page = await context.newPage(); await prepare(page, { owner: 'another-account' });
    await page.goto('http://127.0.0.1:4188/dashboard', { waitUntil: 'networkidle0' });
    assert.equal(await page.$('[data-entry-streak-popup]'), null);
    assert.equal(await page.evaluate(id => localStorage.getItem(`pz_popup_seen_v1:${encodeURIComponent(id)}`), fixtureProfile.id), null);
    results.push({ check: 'other-account evidence suppressed', result: 'passed' });
    await context.close();
  }
  {
    const context = await browser.createBrowserContext();
    const page = await context.newPage(); await prepare(page, { tutorial: true });
    await page.goto('http://127.0.0.1:4188/dashboard', { waitUntil: 'networkidle0' });
    assert.equal(await page.$('[data-entry-streak-popup]'), null);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Got it').click());
    await page.waitForSelector('[data-entry-streak-popup]');
    results.push({ check: 'waits for tutorial dismissal', result: 'passed' });
    await context.close();
  }
  console.log(`PASS ${results.length} entry-streak browser scenarios (local profile/session fixtures, no live account)`);
} finally {
  writeFileSync('.agent/entry-streak/report.json', JSON.stringify(results, null, 2));
  await browser?.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch { /* Test owns only this preview process. */ }
}
