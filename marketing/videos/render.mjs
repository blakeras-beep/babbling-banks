/**
 * Render a video page to MP4: seek every frame, screenshot it, pipe to ffmpeg,
 * then mux the synthesized soundtrack. Usage (from the repo root):
 *   node marketing/videos/render.mjs explainer [--fps 30] [--stills 3,12,20]
 *   node marketing/videos/render.mjs ad
 * --stills writes PNGs at those seconds instead of a video (for checking).
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSoundtrack } from './audio.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const out = path.join(here, 'out');
const args = process.argv.slice(2);
const name = args[0] ?? 'explainer';
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const fps = Number(opt('--fps', 30));
const stills = opt('--stills', null);

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  try {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
const port = server.address().port;

await mkdir(out, { recursive: true });

/** Decode any audio file to 44.1 kHz float channels with ffmpeg. */
function decode(file, channels, pre = [], filter = null) {
  const args = [
    '-v',
    'error',
    ...pre,
    '-i',
    file,
    ...(filter ? ['-af', filter] : []),
    '-f',
    'f32le',
    '-ac',
    String(channels),
    '-ar',
    '44100',
    '-',
  ];
  const raw = spawnSync('ffmpeg', args, { maxBuffer: 1 << 30 }).stdout;
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const chans = Array.from({ length: channels }, () => new Float32Array(all.length / channels));
  for (let i = 0; i < all.length; i++) chans[i % channels][Math.floor(i / channels)] = all[i];
  return chans;
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
});
const page = await browser.newPage();
await page.goto(`http://localhost:${port}/marketing/videos/${name}.html?render`, {
  waitUntil: 'networkidle',
});
await page.evaluate(() => document.fonts.ready);
const video = await page.evaluate(() => ({
  width: VIDEO.width,
  height: VIDEO.height,
  duration: VIDEO.duration,
  sfx: VIDEO.sfx,
  vo: VIDEO.vo ?? [],
  music: VIDEO.music ?? null,
}));
await page.setViewportSize({ width: video.width, height: video.height });

if (stills) {
  for (const s of stills.split(',').map(Number)) {
    await page.evaluate((t) => seek(t), s);
    await page.screenshot({ path: path.join(out, `${name}-${String(s).padStart(5, '0')}.png`) });
  }
  console.log('stills written to', out);
} else {
  const wav = path.join(out, `${name}.wav`);
  const vo = video.vo
    .filter(({ file }) => existsSync(path.join(here, file)))
    .map(({ t, file }) => ({ t, samples: decode(path.join(here, file), 1)[0] }));
  console.log(`${name}: ${vo.length}/${video.vo.length} voiceover clips found`);
  let track = null;
  if (video.music && existsSync(path.join(here, video.music.file))) {
    // Cut the song at `offset`, fade in briefly and out over the last 1.5 s.
    const { file, offset = 0 } = video.music;
    const fade = `afade=t=in:d=0.3,afade=t=out:st=${video.duration - 1.5}:d=1.5`;
    track = decode(
      path.join(here, file),
      2,
      ['-ss', String(offset), '-t', String(video.duration)],
      fade
    );
    console.log(`${name}: music from ${file} at ${offset}s`);
  }
  await writeSoundtrack(wav, video.duration, video.sfx, name, vo, track);
  const mp4 = path.join(out, `${name}.mp4`);
  const ff = spawn(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-framerate',
      String(fps),
      '-c:v',
      'mjpeg',
      '-i',
      '-',
      '-i',
      wav,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '18',
      '-preset',
      'medium',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-shortest',
      mp4,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );
  const frames = Math.round(video.duration * fps);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => seek(t), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (fps * 5) === 0) console.log(`${name}: ${Math.round((i / frames) * 100)}%`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
  console.log('wrote', mp4);
}
await browser.close();
server.close();
