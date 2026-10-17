/**
 * Screenshot every screen at 375 and 1440, light and dark, for comparing
 * against brand/babbling-banks-brand-v1.5/screens/. Usage:
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/screenshot-screens.mjs <outDir> [baseUrl]
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'screenshots';
const base = process.argv[3] ?? 'http://localhost:4173';
mkdirSync(out, { recursive: true });

const SCREENS = [
  ['home', '/'],
  ['results', '/?q=the%20one%20where%20the%20dog%20freezes%20dad'],
  ['empty', '/?q=the%20zorbly%20one%20where%20they%20flumph'],
  ['detail', '/episode/bluey-s1e1'],
  ['404', '/nope'],
  ['art', '/art'],
  ['favorites', '/favorites'],
  ['shows', '/shows'],
  ['show', '/show/bluey'],
  ['loading', '/?q=the%20purple%20one%20where%20they%20go%20up&preview=loading'],
  ['offline', '/?preview=offline'],
];

const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ executablePath });
for (const theme of ['light', 'dark']) {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 375 ? 780 : 900 },
      deviceScaleFactor: width === 375 ? 2 : 1,
      colorScheme: theme,
    });
    // Light is the standard; "night" is a per-device choice, so set it the way the app stores it.
    await context.addInitScript((value) => {
      localStorage.setItem('babbling-banks:theme', JSON.stringify(value));
    }, theme);
    for (const [name, url] of SCREENS) {
      const page = await context.newPage();
      await page.goto(base + url, { waitUntil: 'networkidle' });
      if (name === 'detail') {
        // Arrive from a search so "what they said" shows.
        await page.goto(base + '/?q=the%20one%20where%20the%20dog%20freezes%20dad', {
          waitUntil: 'networkidle',
        });
        await page.click('.result-card__title a');
        await page.waitForSelector('.detail-card');
      }
      // Scroll through so lazy images load before a full-page capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
        await document.fonts.ready;
      });
      await page.waitForTimeout(250);
      const file = path.join(out, `${name}-${width}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scrollWidth > width)
        console.log(`HORIZONTAL SCROLL: ${name} ${width} ${theme} (${scrollWidth})`);
      await page.close();
    }
    await context.close();
  }
}
await browser.close();
console.log('done', out);
