import { build, createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Isolated review artifact: never imported by the app router or production bundle.
const result = await build({
  configFile: false,
  root: path.resolve('design/seedling'),
  plugins: [react()],
  resolve: { alias: { '@': path.resolve('src') } },
  build: { write: false, minify: true, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true } } },
});
if (Array.isArray(result) || !('output' in result)) throw new Error('Expected one preview bundle');
const js = result.output.filter(item => item.type === 'chunk').map(item => item.code).join('\n');
const css = result.output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css')).map(item => String(item.source)).join('\n');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Studenius seedling — review draft</title><style>${css}</style><body><div id="root"></div><script type="module">${js.replaceAll('</script', '<\\/script')}</script></body></html>`;
await mkdir('design/seedling/review', { recursive: true });
await writeFile('design/seedling/review/preview.html', html);
const renderer = await createServer({ configFile: false, esbuild: { jsx: 'automatic', jsxDev: false }, server: { middlewareMode: true }, resolve: { alias: { '@': path.resolve('src') } } });
try {
  const { SeedlingArtwork } = await renderer.ssrLoadModule('/design/seedling/SeedlingArtwork.tsx');
  const markup = renderToStaticMarkup(createElement(SeedlingArtwork, { mood: 'idle', blink: false, reduced: true }));
  const visibility = '<style>[data-layer^="eyelid"],[data-eye="blink"],[data-layer="typing"],[data-layer="burst"],[data-mouth]:not([data-mouth="smile"]){opacity:0}</style>';
  const svg = markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/(<svg[^>]*>)/, `$1${visibility}`);
  if (Buffer.byteLength(svg) >= 10_000) throw new Error('Mascot exceeds the 10KB art budget');
  await writeFile('design/seedling/review/mascot.svg', svg);
  console.log(`Wrote standalone mascot.svg (${Buffer.byteLength(svg)} bytes)`);
} finally { await renderer.close(); }
console.log('Wrote standalone design/seedling/review/preview.html');
