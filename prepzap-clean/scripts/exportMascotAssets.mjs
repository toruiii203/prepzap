import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

// Compatibility URLs keep saved profiles intact. Every output is rendered from
// the approved vector; no previous mascot image is read or traced.
const renderer = await createServer({ configFile: false, esbuild: { jsx: 'automatic', jsxDev: false }, server: { middlewareMode: true }, resolve: { alias: { '@': path.resolve('src') } } });
let browser;
try {
  const { SeedlingArtwork } = await renderer.ssrLoadModule('/src/components/mascot/SeedlingArtwork.tsx');
  const css = await readFile('src/styles/seedling.css', 'utf8');
  browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const cache = new Map();
  async function render(mood, size, type, icon = false, background = false) {
    const key = `${mood}:${size}:${type}:${icon}:${background}`;
    if (cache.has(key)) return cache.get(key);
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    const svg = renderToStaticMarkup(createElement(SeedlingArtwork, { mood, blink: false, reduced: true }));
    await page.setContent(`<style>${css}body{margin:0;background:${icon || background ? '#FAF7F2' : 'transparent'}}svg{width:${icon ? '85%' : '100%'}!important;${icon ? 'margin:7.5%;' : ''}}</style>${svg}`);
    const bytes = await page.screenshot({ type, omitBackground: !icon && !background && type !== 'jpeg', ...(type === 'png' ? {} : { quality: 90 }) });
    cache.set(key, bytes);
    return bytes;
  }
  function moodFor(name) {
    if (/celebrat|excited|surprised/.test(name)) return 'celebrate';
    if (/think|thoughtful|explain|listen/.test(name)) return 'thinking';
    if (/waving|nodding/.test(name)) return 'encourage';
    if (/smile|happy|laugh|speak|speech|talk/.test(name)) return 'happy';
    return 'idle';
  }
  const targets = ['public/fox_scholar.jpg', 'public/fox_icon_final.png', 'public/buddies/fox_scholar.png'];
  for (const folder of ['public/fox', 'public/animations']) {
    for (const name of await readdir(folder)) if (/\.(png|jpe?g|webp|gif)$/.test(name)) targets.push(`${folder}/${name}`);
  }
  for (const target of targets) {
    if (target.endsWith('.gif')) {
      const temporary = `.agent/seedling-${moodFor(target)}.png`;
      await writeFile(temporary, await render(moodFor(target), 400, 'png'));
      execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', temporary, '-frames:v', '1', target]);
    } else {
      const type = /\.jpe?g$/.test(target) ? 'jpeg' : target.endsWith('.webp') ? 'webp' : 'png';
      await writeFile(target, await render(moodFor(target), 400, type, target.includes('fox_icon'), target.includes('call_bg')));
    }
  }
  for (const [target, size] of [['public/icon-48.png',48],['public/icon-72.png',72],['public/icon-96.png',96],['public/icon-128.png',128],['public/favicon-16.png',16],['public/favicon-32.png',32],['public/apple-touch-icon.png',180],['public/icon-192.png',192],['public/icon-512.png',512]]) {
    await writeFile(target, await render('idle', size, 'png', true));
  }
  for (const size of [48,72,96,128,192,256,512]) await writeFile(`public/icons/icon-${size}.webp`, await render('idle', size, 'webp', true));
  await mkdir('public/mascot', { recursive: true });
  await writeFile('public/mascot/seedling.svg', await readFile('design/seedling/review/mascot.svg'));
  console.log(`Exported ${targets.length} legacy mascot URLs plus app icons from the approved SVG. Static image aliases do not animate in reduced-motion mode.`);
} finally { await browser?.close(); await renderer.close(); }
