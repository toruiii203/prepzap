import { spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { seedBrowser } from './uiFixtures.mjs';

const port = 4173;
const base = `http://127.0.0.1:${port}`;
const source = readFileSync('src/App.tsx', 'utf8');
const routes = [...source.matchAll(/<Route path="([^"]+)"/g)].map(([, pattern]) => ({
  pattern, path: pattern === '*' ? '/ui-smoke-not-found' : pattern.replace(':type', 'quiz').replace(/:\w+/g, 'ui-fixture'),
}));
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const server = spawn('npm', ['exec', '--', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true });
let browser;
const results = [];
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Preview server did not start');
  browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  for (let index = 0; index < routes.length; index++) {
    const route = routes[index];
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewport({ width: index % 2 ? 390 : 1280, height: 844 });
    await seedBrowser(page, { theme: index % 2 ? 'dark' : 'light' });
    try {
      const response = await page.goto(base + route.path, { waitUntil: 'networkidle2', timeout: 20000 });
      if (!response?.ok()) errors.push(`HTTP ${response?.status()}`);
      await page.waitForSelector('[data-motion-page]', { timeout: 15000 });
      if (!await page.$eval('#root', element => !!element.textContent?.trim())) errors.push('Empty application root');
      if (await page.$('html.dark') && await page.$eval('html', element => getComputedStyle(element).filter !== 'none')) errors.push('Inversion filter remains');
    } catch (error) { errors.push(error.message); }
    const result = { ...route, theme: index % 2 ? 'dark' : 'light', width: index % 2 ? 390 : 1280, finalPath: new URL(page.url()).pathname, errors };
    results.push(result);
    console.log(`${errors.length ? 'FAIL' : 'PASS'} ${route.pattern}${errors.length ? ': ' + errors.join(' | ') : ''}`);
    await page.close();
  }
} finally {
  await browser?.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch { /* Preview may have exited already. */ }
  mkdirSync('.agent', { recursive: true });
  writeFileSync('.agent/route-report.json', JSON.stringify(results, null, 2));
}
const failed = results.filter(result => result.errors.length);
console.log(`${results.length - failed.length}/${routes.length} route patterns passed; HTTP/auth/realtime fixtures, no live account operations.`);
if (failed.length || results.length !== routes.length) process.exitCode = 1;
