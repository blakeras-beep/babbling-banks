/**
 * Render the share card (1200 x 630) to public/og-image.png.
 *
 * The site is a static Vite build, so the OG image is a static file: this
 * script lays the card out in HTML with the brand fonts and art, screenshots
 * it with the Chromium that Playwright ships, and writes the PNG. Run it after
 * changing the card's copy or the art:
 *
 *   npm run generate-og-image
 *
 * Set CHROMIUM_PATH to a Chromium binary if Playwright's default is not installed.
 */
import { chromium } from 'playwright-core';
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const out = path.join(publicDir, 'og-image.png');

const collection = JSON.parse(
  readFileSync(path.join(root, 'src/data/art-collection.json'), 'utf8')
);
const piece = collection.pieces.find((p) => p.usedOn.includes('share-card'));
const artFile = path.join(publicDir, 'art', path.basename(piece.files.web));
const credit = collection.creditFormat.replace('{title}', piece.title);

// The card's words. The matched words get the lemon swipe (max three).
const QUOTE = ['the', 'one', 'where', 'the', 'dog', 'freezes', 'dad'];
const MATCHED = ['dog', 'freezes', 'dad'];
const TITLE = 'Magic Xylophone';
const SHOW = 'Bluey';
const CODE = 'S1E01';

// Chromium will not load file:// subresources into a page set from memory,
// so serve public/ (and the card itself) over a throwaway local server.
const TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
let html = '';
const server = createServer((req, res) => {
  if (req.url === '/__card.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  const file = path.join(publicDir, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(publicDir) || !existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const url = (file) => `${base}/${path.relative(publicDir, file).split(path.sep).join('/')}`;
const font = (file) => url(path.join(publicDir, 'fonts', file));

let swipe = 0;
const quoteHtml = QUOTE.map((word, index) => {
  const first = index === 0;
  const last = index === QUOTE.length - 1;
  let node = word;
  if (MATCHED.includes(word)) {
    node = `<span class="match${swipe % 2 ? ' alt' : ''}">${word}</span>`;
    swipe += 1;
  }
  if (first) node = `<span class="nowrap">&ldquo;${node}</span>`;
  if (last) node = `<span class="nowrap">${node}&rdquo;</span>`;
  return node;
}).join(' ');

html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>
  @font-face { font-family: "DynaPuff"; src: url("${font('DynaPuff-600.woff2')}") format("woff2"); font-weight: 600; font-display: block; }
  @font-face { font-family: "Dela Gothic One"; src: url("${font('DelaGothicOne-400.woff2')}") format("woff2"); font-weight: 400; font-display: block; }
  @font-face { font-family: "Atkinson Hyperlegible Next"; src: url("${font('AtkinsonHyperlegibleNext-400.woff2')}") format("woff2"); font-weight: 400; font-display: block; }
  @font-face { font-family: "Atkinson Hyperlegible Next"; src: url("${font('AtkinsonHyperlegibleNext-700.woff2')}") format("woff2"); font-weight: 700; font-display: block; }
  @font-face { font-family: "IBM Plex Mono"; src: url("${font('IBMPlexMono-500.woff2')}") format("woff2"); font-weight: 500; font-display: block; }
  :root {
    --ink: #1D1C1F; --paper: #F5F6F2; --tape: #FFFFFF; --muted: #5E615A; --cobalt: #3550B8;
    --f-playful: "DynaPuff", "Arial Rounded MT Bold", sans-serif;
    --f-dela: "Dela Gothic One", "Arial Black", sans-serif;
    --f-body: "Atkinson Hyperlegible Next", Verdana, sans-serif;
    --f-mono: "IBM Plex Mono", Menlo, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--paper); }
  .card { position: relative; width: 1200px; height: 630px; overflow: hidden; background: var(--paper); color: var(--ink); -webkit-font-smoothing: antialiased; }
  .art { position: absolute; left: 0; top: 0; bottom: 0; width: 46%; overflow: hidden; }
  .art img { width: 100%; height: 100%; object-fit: cover; object-position: ${piece.focus}; display: block; }
  .right { position: absolute; left: 46%; right: 0; top: 0; bottom: 0; padding: 40px 48px 0 40px; }
  .tape { background: var(--tape); }
  .quote-strip { padding: 18px 22px 20px; transform: rotate(-2deg); margin-left: -72px; }
  .quote-strip p { margin: 0; font: 400 40px/1.15 var(--f-dela); letter-spacing: -0.01em; }
  .nowrap { white-space: nowrap; }
  .match { position: relative; isolation: isolate; display: inline-block; }
  .match::before { content: ""; position: absolute; z-index: -1; left: -0.18em; right: -0.18em; top: 0.12em; bottom: -0.08em; background: url("${url(path.join(publicDir, 'art/crayon-swipe-lemon.png'))}") center / 100% 100% no-repeat; }
  .match.alt::before { background-image: url("${url(path.join(publicDir, 'art/crayon-swipe-lemon-2.png'))}"); }
  .arrow-row { position: relative; height: 84px; }
  .arrow-row img { position: absolute; left: 34px; top: 0; width: 86px; height: 82px; }
  .found { position: absolute; left: 132px; top: 34px; background: var(--tape); padding: 7px 10px; font: 600 18px/1.1 var(--f-playful); color: var(--cobalt); transform: rotate(-4deg); }
  .result-strip { padding: 22px 22px 18px; transform: rotate(1deg); }
  .result-strip h1 { margin: 0; font: 400 56px/1.0 var(--f-dela); text-wrap: balance; }
  .caption-row { margin: 12px 0 0; display: flex; gap: 14px; align-items: baseline; }
  .show-name { font: 700 18px/1.3 var(--f-body); color: var(--cobalt); }
  .code { font: 500 18px/1.3 var(--f-mono); }
  .sign { position: absolute; right: 48px; bottom: 28px; text-align: right; }
  .sign img { display: block; width: 220px; height: auto; margin-left: auto; }
  .credit { display: block; margin-top: 10px; font: 400 16px/1 var(--f-body); color: var(--muted); }
</style></head>
<body><div class="card">
  <div class="art"><img src="${url(artFile)}" alt=""></div>
  <div class="right">
    <div class="tape quote-strip"><p>${quoteHtml}</p></div>
    <div class="arrow-row">
      <img src="${url(path.join(publicDir, 'art/crayon-arrow-ink.png'))}" alt="">
      <span class="found">found it</span>
    </div>
    <div class="tape result-strip">
      <h1>${TITLE}</h1>
      <p class="caption-row"><span class="show-name">${SHOW}</span><span class="code">${CODE}</span></p>
    </div>
  </div>
  <div class="sign">
    <img src="${url(path.join(publicDir, 'logo/wordmark.svg'))}" alt="babbling banks">
    <span class="credit">${credit}</span>
  </div>
</div></body></html>`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.goto(`${base}/__card.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(100);
writeFileSync(out, await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }));
await browser.close();
server.close();
console.log(`wrote ${path.relative(root, out)} (${credit})`);
