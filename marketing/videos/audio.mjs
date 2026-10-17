/**
 * Soundtrack: an original funk-rock vamp synthesized here (slap bass, wah
 * guitar, drums), small foley for the on-screen moments, and the voiceover
 * clips mixed on top with the music ducked under them.
 */
import { writeFile } from 'node:fs/promises';

const SR = 44100;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

export async function writeSoundtrack(file, duration, sfx = [], name = 'x', vo = []) {
  let musicBus;
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

  // ---- music: an original funk-rock vamp (E dorian, E7 to A7), slap bass,
  // 16th-note scratch guitar with wah, tight drums. Written to the vibe, not a copy of any song.
  const M = new Float32Array(n),
    MR = new Float32Array(n);
  const addM = (i, v, pan = 0) => {
    if (i >= 0 && i < n) {
      M[i] += v * (1 - pan);
      MR[i] += v * (1 + pan);
    }
  };
  const bpm = name === 'ad' ? 104 : 98;
  const sixteenth = 60 / bpm / 4;
  const swing = 0.12; // late off-beat 16ths
  const stepTime = (bar, st) => (bar * 16 + st + (st % 2 ? swing : 0)) * sixteenth;
  const kick = (t0, amp) => {
    const i0 = Math.floor(t0 * SR);
    let ph = 0;
    for (let k = 0; k < 0.32 * SR; k++) {
      const t = k / SR;
      ph += (2 * Math.PI * (45 + 95 * Math.exp(-t * 30))) / SR;
      addM(i0 + k, (Math.sin(ph) * Math.exp(-t * 9) + (k < 40 ? (rand() - 0.5) * 0.6 : 0)) * amp);
    }
  };
  const snare = (t0, amp) => {
    const i0 = Math.floor(t0 * SR);
    let y = 0;
    for (let k = 0; k < 0.22 * SR; k++) {
      const t = k / SR,
        x = rand() * 2 - 1;
      y += 0.35 * (x - y);
      addM(
        i0 + k,
        ((x - y) * 0.8 * Math.exp(-t * 18) +
          Math.sin(2 * Math.PI * 190 * t) * 0.5 * Math.exp(-t * 30)) *
          amp,
        0.05
      );
    }
  };
  const hat = (t0, amp, open = false) => {
    const i0 = Math.floor(t0 * SR);
    let y = 0;
    const len = (open ? 0.28 : 0.045) * SR;
    for (let k = 0; k < len; k++) {
      const x = rand() * 2 - 1;
      y += 0.6 * (x - y);
      addM(i0 + k, (x - y) * amp * Math.exp((-k / SR) * (open ? 9 : 70)), 0.35);
    }
  };
  // Karplus-Strong string: `damp` near 1 rings, lower mutes. Returns into a buffer.
  const string = (f, dur, bright, damp) => {
    const len = Math.floor(dur * SR),
      out = new Float32Array(len),
      P = Math.max(2, Math.round(SR / f)),
      d = new Float32Array(P);
    let lp = 0;
    for (let k = 0; k < P; k++) {
      lp += bright * (rand() * 2 - 1 - lp);
      d[k] = lp;
    }
    for (let k = 0, j = 0; k < len; k++, j = (j + 1) % P) {
      const nx = (j + 1) % P;
      out[k] = d[j];
      d[j] = damp * 0.5 * (d[j] + d[nx]);
    }
    return out;
  };
  const place = (buf, t0, amp, pan, shape = (x) => x) => {
    const i0 = Math.floor(t0 * SR);
    for (let k = 0; k < buf.length; k++)
      addM(i0 + k, shape(buf[k]) * amp * Math.min(1, k / 30), pan);
  };
  // Slap bass: thumb (dark, round) or pop (bright, octave up, with a snap).
  const bassNote = (t0, note, kind, len) => {
    const f = midi(note);
    if (kind === 'ghost') return place(string(f, 0.06, 0.9, 0.9), t0, 0.35, -0.05);
    const pop = kind === 'pop';
    const b = string(f, len, pop ? 0.95 : 0.55, pop ? 0.997 : 0.999);
    // A little fundamental under the string so the low end is solid.
    for (let k = 0; k < b.length; k++)
      b[k] += 0.5 * Math.sin((2 * Math.PI * f * k) / SR) * Math.exp((-k / SR) * 3.5);
    place(b, t0, pop ? 0.55 : 0.75, -0.05, (x) => Math.tanh(x * 1.8));
  };
  // Guitar: a chord of strings, either muted scratch or a stab through a wah sweep.
  const chord = (t0, notes, kind) => {
    const dur = kind === 'scratch' ? 0.07 : 0.32;
    const mix = new Float32Array(Math.floor(dur * SR));
    notes.forEach((nn, s) => {
      const b = string(midi(nn), dur, 0.9, kind === 'scratch' ? 0.93 : 0.996);
      const off = Math.floor(s * 0.004 * SR); // strum
      for (let k = 0; k + off < mix.length; k++) mix[k + off] += b[k];
    });
    // Wah: state-variable band-pass whose centre sweeps up through the stab.
    let low = 0,
      band = 0;
    for (let k = 0; k < mix.length; k++) {
      const p = k / mix.length;
      const fc =
        kind === 'scratch' ? 1500 : 450 + 1900 * Math.sin(Math.min(1, p * 2.2) * Math.PI * 0.5);
      const fq = 2 * Math.sin((Math.PI * fc) / SR);
      low += fq * band;
      const high = mix[k] - low - 0.35 * band;
      band += fq * high;
      mix[k] =
        Math.tanh((band * 1.4 + mix[k] * 0.25) * 1.5) *
        Math.pow(1 - p, kind === 'scratch' ? 2 : 0.6);
    }
    place(mix, t0, kind === 'scratch' ? 0.16 : 0.24, 0.32);
  };
  const E7 = [52, 56, 62, 64, 68]; // E G# D E G# (E7 with the 9-ish shimmer of the open string)
  const A9 = [57, 61, 64, 67, 71]; // A C# E G B
  const G6 = [55, 59, 62, 64, 67];
  // Bass riff on the root, in 16ths: [step, interval, kind]
  const riff = [
    [0, 0, 'thumb'],
    [2, 12, 'pop'],
    [3, 0, 'ghost'],
    [5, 3, 'thumb'],
    [6, 5, 'thumb'],
    [8, 0, 'thumb'],
    [10, 10, 'pop'],
    [11, 12, 'pop'],
    [13, 7, 'thumb'],
    [14, 5, 'thumb'],
    [15, 3, 'ghost'],
  ];
  const guitar = [
    [0, 'stab'],
    [1, 'scratch'],
    [3, 'scratch'],
    [5, 'scratch'],
    [6, 'stab'],
    [7, 'scratch'],
    [9, 'scratch'],
    [10, 'stab'],
    [11, 'scratch'],
    [13, 'scratch'],
    [14, 'scratch'],
    [15, 'scratch'],
  ];
  const bars = Math.floor((duration - 1.2) / (16 * sixteenth));
  for (let bar = 0; bar < bars; bar++) {
    const form = bar % 4;
    const root = form === 3 ? (bar % 8 === 7 ? 43 : 45) : form === 1 ? 45 : 40; // E A E A/G
    const voicing = root === 40 ? E7 : root === 45 ? A9 : G6;
    const intro = name !== 'ad' && bar === 0;
    for (let st = 0; st < 16; st++) {
      const t = stepTime(bar, st);
      hat(t, st % 4 === 0 ? 0.12 : st % 2 ? 0.05 : 0.08, st === 14 && form === 3);
      if ([0, 7, 10].includes(st) || (st === 14 && form === 1)) kick(t, 0.9);
      if (st === 4 || st === 12) snare(t, 0.7);
      if ((st === 9 || st === 15) && !intro) snare(t, 0.12);
    }
    for (const [st, iv, kind] of riff) {
      const nextStep = riff.find((r) => r[0] > st)?.[0] ?? 16;
      bassNote(
        stepTime(bar, st),
        root + iv - 12 + 12,
        kind,
        Math.max(0.08, (nextStep - st) * sixteenth * 0.95)
      );
    }
    if (!intro) for (const [st, kind] of guitar) chord(stepTime(bar, st), voicing, kind);
  }
  // Last hit: E7 stab, kick and crash-ish open hat, let it ring.
  const endT = stepTime(bars, 0);
  kick(endT, 1);
  hat(endT, 0.2, true);
  bassNote(endT, 40, 'thumb', 1.2);
  chord(endT, E7, 'stab');
  // Music fades only at the very edges.
  for (let i = 0; i < n; i++) {
    const t = i / SR,
      g = Math.min(1, t / 0.05, Math.max(0, (duration - t) / 0.8));
    M[i] *= g;
    MR[i] *= g;
  }
  musicBus = [M, MR];

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

  // ---- voiceover, with the music ducked under it ----
  const V = new Float32Array(n);
  for (const { t, samples } of vo) {
    const i0 = Math.floor(t * SR);
    for (let k = 0; k < samples.length && i0 + k < n; k++) V[i0 + k] += samples[k];
  }
  let env = 0;

  // Normalise the music bed to a set level before mixing.
  let mp = 0;
  for (let i = 0; i < n; i++) mp = Math.max(mp, Math.abs(M[i]), Math.abs(MR[i]));
  const mg = mp ? 0.42 / mp : 1;
  let vp = 0;
  for (let i = 0; i < n; i++) vp = Math.max(vp, Math.abs(V[i]));
  const vg = vp ? 0.85 / vp : 1;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(V[i]) > 0.01 ? 1 : 0;
    env += (a - env) * (a > env ? 0.002 : 0.00008); // fast duck, slow release
    const duck = vo.length ? 1 - 0.55 * env : 1;
    L[i] += M[i] * mg * duck + V[i] * vg;
    R[i] += MR[i] * mg * duck + V[i] * vg;
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
