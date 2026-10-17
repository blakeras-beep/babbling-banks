/**
 * Soundtrack synth: a soft kalimba bed (C, Am, F, G) plus small foley for the
 * on-screen moments (keys, taps, crayon, tape, the "found it" pop). Everything
 * is generated here, so there is nothing to license.
 */
import { writeFile } from 'node:fs/promises';

const SR = 44100;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

export async function writeSoundtrack(file, duration, sfx = [], name = 'x') {
  const n = Math.ceil(duration * SR);
  const L = new Float32Array(n),
    R = new Float32Array(n);
  const add = (i, v, pan = 0) => {
    if (i >= 0 && i < n) {
      L[i] += v * (1 - pan);
      R[i] += v * (1 + pan);
    }
  };
  const rand = rng(name.length * 977 + 7);

  // ---- music bed ----
  const bpm = name === 'ad' ? 112 : 96;
  const beat = 60 / bpm;
  const chords = [
    [48, [60, 64, 67, 72, 76]],
    [45, [57, 60, 64, 69, 72]],
    [41, [53, 57, 60, 65, 69]],
    [43, [55, 59, 62, 67, 71]],
  ];
  const pluck = (t0, f, amp, pan) => {
    const len = Math.floor(1.6 * SR),
      i0 = Math.floor(t0 * SR);
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      const v =
        Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 4.5) +
        0.25 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t * 9) +
        0.08 * Math.sin(2 * Math.PI * 5.4 * f * t) * Math.exp(-t * 40);
      add(i0 + k, v * amp * Math.min(1, t * 400), pan);
    }
  };
  const bass = (t0, f, amp) => {
    const len = Math.floor(beat * 1.8 * SR),
      i0 = Math.floor(t0 * SR);
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      add(
        i0 + k,
        (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(4 * Math.PI * f * t)) *
          amp *
          Math.min(1, t * 60) *
          Math.exp(-t * 1.8)
      );
    }
  };
  const shaker = (t0, amp) => {
    const len = Math.floor(0.07 * SR),
      i0 = Math.floor(t0 * SR);
    let lp = 0;
    for (let k = 0; k < len; k++) {
      const x = rand() * 2 - 1;
      lp += 0.5 * (x - lp);
      add(i0 + k, (x - lp) * amp * Math.exp((-k / SR) * 60), 0.3);
    }
  };
  const bar = beat * 4;
  const end = duration - 0.5;
  for (let b = 0, t = 0; t < end; b++, t = b * bar) {
    const [root, notes] = chords[b % 4];
    bass(t, midi(root - 12), 0.16);
    bass(t + beat * 2, midi(root - 12), 0.11);
    for (let e = 0; e < 8; e++) {
      const te = t + (e * beat) / 2;
      if (te >= end) break;
      shaker(te + beat / 4, e % 2 ? 0.05 : 0.03);
      // A sparse, repeating melody: the same shape each bar, varied by chord.
      const pattern = [0, -1, 2, -1, 3, 1, -1, 4];
      if (pattern[e] >= 0 && (e !== 7 || b % 2))
        pluck(te, midi(notes[pattern[e]]), e === 0 ? 0.13 : 0.09, (pattern[e] - 2) * 0.12);
    }
  }
  // Fade the bed in and out.
  for (let i = 0; i < n; i++) {
    const t = i / SR,
      g = Math.min(1, t / 1.2, Math.max(0, (duration - t) / 2.5));
    L[i] *= g;
    R[i] *= g;
  }

  // ---- foley ----
  const noise = (
    t0,
    dur,
    amp,
    { lp = 0.3, hp = false, env = (p) => 1 - p, jitter = 0, pan = 0 } = {}
  ) => {
    const len = Math.floor(dur * SR),
      i0 = Math.floor(t0 * SR);
    let y = 0;
    for (let k = 0; k < len; k++) {
      const p = k / len,
        x = rand() * 2 - 1;
      y += lp * (x - y);
      const j = jitter
        ? 0.55 + 0.45 * Math.sin((k / SR) * 2 * Math.PI * jitter + Math.sin((k / SR) * 37))
        : 1;
      add(i0 + k, (hp ? x - y : y) * amp * env(p) * j, pan);
    }
  };
  const tone = (t0, dur, f0, f1, amp) => {
    const len = Math.floor(dur * SR),
      i0 = Math.floor(t0 * SR);
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const p = k / len;
      ph += (2 * Math.PI * (f0 + (f1 - f0) * Math.sqrt(p))) / SR;
      add(i0 + k, Math.sin(ph) * amp * Math.min(1, k / 60) * Math.pow(1 - p, 2));
    }
  };
  for (const { t, kind } of sfx) {
    if (kind === 'key')
      noise(t, 0.025, 0.22, {
        hp: true,
        lp: 0.2,
        env: (p) => Math.pow(1 - p, 3),
        pan: rand() * 0.4 - 0.2,
      });
    if (kind === 'space') noise(t, 0.04, 0.3, { lp: 0.08, env: (p) => Math.pow(1 - p, 2) });
    if (kind === 'tap') tone(t, 0.05, 1200, 700, 0.18);
    if (kind === 'pop') tone(t, 0.14, 420, 980, 0.28);
    if (kind === 'crayon')
      noise(t, 0.32, 0.16, { hp: true, lp: 0.1, jitter: 18, env: (p) => Math.sin(Math.PI * p) });
    if (kind === 'tape')
      noise(t, 0.12, 0.3, { lp: 0.12, env: (p) => (p < 0.1 ? p * 10 : Math.pow(1 - p, 2)) });
    if (kind === 'whoosh')
      noise(t - 0.15, 0.5, 0.22, { lp: 0.05, env: (p) => Math.pow(Math.sin(Math.PI * p), 2) });
  }

  // ---- normalize to -1 dBFS and write 16-bit stereo ----
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak ? 0.89 / peak : 1;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  await writeFile(file, buf);
}
