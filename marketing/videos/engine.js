/*
 * Tiny deterministic timeline. A video defines window.VIDEO = { width, height,
 * duration, render(t), sfx }. render(t) sets every style from t alone, so any
 * frame can be drawn in any order: the renderer seeks frame by frame, and the
 * browser preview just plays it in real time.
 */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const ease = {
  linear: (p) => p,
  out: (p) => 1 - Math.pow(1 - p, 3),
  inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  // A small settle past the target, like a strip of tape pressed down.
  back: (p) => {
    const c = 1.6;
    return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
  },
};
/** Progress of t through [a, b], eased. */
export const prog = (t, a, b, fn = ease.out) => fn(clamp((t - a) / (b - a)));
/** 1 inside [a, b] with fades of `f` seconds on each side. */
export const window_ = (t, a, b, f = 0.4) => Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function set(el, { x = 0, y = 0, r = 0, s = 1, o } = {}) {
  el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;
  if (o !== undefined) el.style.opacity = o;
}

/** Types `text` into el between a and b, with a caret while typing. */
export function type(el, text, t, a, b, caret = true) {
  const n = Math.round(clamp((t - a) / (b - a)) * text.length);
  const typing = t >= a - 0.6 && t < b + 0.5;
  const blink = Math.floor(t * 2.2) % 2 === 0 || (t >= a && t < b);
  el.innerHTML =
    escape(text.slice(0, n)) + (caret && typing && blink ? '<span class="caret"></span>' : '');
  return n;
}
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Reveal a lemon swipe left to right. */
export function swipe(el, p) {
  const i = el.querySelector('i');
  i.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
}

/** Reveal the ink crayon arrow from its tail to its head. */
export function drawArrow(el, p) {
  el.style.clipPath = `inset(0 ${(1 - p) * 100}% ${(1 - p) * 100}% 0)`;
  el.style.opacity = p > 0 ? 1 : 0;
}

export function boot(video) {
  window.VIDEO = video;
  const stage = document.getElementById('stage');
  stage.style.width = video.width + 'px';
  stage.style.height = video.height + 'px';
  window.seek = (t) => video.render(t);
  const params = new URLSearchParams(location.search);
  if (params.has('render')) {
    video.render(0);
    return;
  }
  // Preview: fit the stage to the window and loop in real time.
  const fit = () => {
    const s = Math.min(innerWidth / video.width, innerHeight / video.height);
    stage.style.transform = `translate(${(innerWidth - video.width * s) / 2}px, ${(innerHeight - video.height * s) / 2}px) scale(${s})`;
  };
  addEventListener('resize', fit);
  fit();
  const start = performance.now() - (Number(params.get('t')) || 0) * 1000;
  const tick = (now) => {
    video.render(((now - start) / 1000) % video.duration);
    requestAnimationFrame(tick);
  };
  document.fonts.ready.then(() => requestAnimationFrame(tick));
}
