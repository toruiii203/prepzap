import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const html = await readFile('design/seedling/review/preview.html');
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const results = [];
try {
  const page = await browser.newPage();
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:')) externalRequests.push(request.url()); });
  await page.setViewport({ width: 1200, height: 1120, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle0' });
  assert.equal(await page.$$eval('[data-preview-mood]', elements => elements.length), 7);
  // No artwork download, analytics or application requests in this standalone fixture.
  assert.deepEqual(externalRequests, []);
  // Labels are used instead of nth-child selectors because each checkbox has its own label.
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('label')].find(label => label.textContent.includes('Static poses')).querySelector('input');
    if (!input.checked) input.click();
  });
  for (const dark of [false, true]) {
    await page.evaluate(value => {
      const input = [...document.querySelectorAll('label')].find(label => label.textContent.includes('Dark background')).querySelector('input');
      if (input.checked !== value) input.click();
    }, dark);
    await page.screenshot({ path: `design/seedling/review/moods-${dark ? 'dark' : 'light'}.png`, fullPage: true });
    for (const width of [320, 390, 844, 1200]) {
      await page.setViewport({ width, height: width === 844 ? 390 : 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}px`);
      results.push({ theme: dark ? 'dark' : 'light', width, overflow: false });
    }
  }
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('label')].find(label => label.textContent.includes('Static poses')).querySelector('input');
    if (input.checked) input.click();
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.mascot')].every(element => element.dataset.reducedMotion === 'true'));
  const moving = await page.evaluate(() => [...document.querySelectorAll('.seedling-art *')].filter(element => getComputedStyle(element).animationName !== 'none').length);
  assert.equal(moving, 0, 'OS reduced motion must disable every art animation');
  const invalidAnimatedProperties = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => [...sheet.cssRules]).filter(rule => rule.type === CSSRule.KEYFRAMES_RULE).filter(rule => rule.name.startsWith('seed-')).flatMap(rule => [...rule.cssRules].flatMap(frame => [...frame.style].filter(property => !['transform', 'opacity'].includes(property)))));
  assert.deepEqual(invalidAnimatedProperties, []);
  assert.deepEqual(errors, []);
  await writeFile('.agent/seedling-browser-report.json', JSON.stringify({ results, externalRequests, errors, reducedMotionMovingElements: moving, invalidAnimatedProperties }, null, 2));
  console.log(`PASS ${results.length} viewport/theme checks; OS reduced motion; transform/opacity-only keyframes; no external requests or browser errors`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
