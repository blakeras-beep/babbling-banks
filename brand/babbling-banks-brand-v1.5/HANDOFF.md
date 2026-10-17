# Babbling Banks brand v1.5: handoff for implementation

You're implementing the Babbling Banks rebrand on babblingbanks.com, the toddler TV episode finder. It replaces the old look (teal and coral, emoji) completely. Nothing from the old styling carries over.

## Read first

1. `DESIGN.md` is the source of truth. If anything else here disagrees, DESIGN.md wins, then `screens/`, then anything else.
2. `screens/*.html` + `.png` are reference mockups of every screen in light and dark. Match them; don't copy their markup wholesale, because the board files wrap several phones in one page.
3. `assets/art/collection.json` lists every art piece with its title, mode, focus point and where it's used. Read titles and modes from it rather than hard-coding them.

## What's in here

| Path | What |
|---|---|
| `DESIGN.md` | The spec: tokens in the front matter, rules and components in the body. Lints clean with `npx @google/design.md lint DESIGN.md`. |
| `colors_and_type.css` | CSS custom properties for every color, type style, tilt and art URL, with the dark theme under `[data-theme="dark"]` only (light is the standard; nothing reads `prefers-color-scheme`). Generated from DESIGN.md; regenerate rather than hand-edit if the spec changes. |
| `brand.tokens.json` | The same tokens in DTCG format, if your build uses a token pipeline. |
| `assets/fonts/` | Self-hosted woff2: DynaPuff 600, Dela Gothic One 400, Atkinson Hyperlegible Next 400/700, IBM Plex Mono 500. |
| `assets/logo/` | Outlined SVG wordmark (ink, reversed, one-color) and the app icon. Use the SVGs; never set the wordmark in live type. |
| `assets/art/` | Banks' pieces: `<id>-1600.jpg` for the web, `-cutout.png` transparent versions of three pieces, and the crayon marks (`crayon-swipe-lemon*.png`, `crayon-line-cobalt.png`, `crayon-arrow-ink.png`). |
| `screens/` | Reference screens: home + results, detail, empty, 404 / art page / loading / offline, the 1200 × 630 share card, and dark versions. |
| `examples/` | The core screens on one sheet, plus the art collection. |
| `preview.html`, `art-gallery.html` | Token sheet and collection page, built on `colors_and_type.css`. Handy for checking the CSS works. |

## Build checklist

- [ ] Load the five fonts with `font-display: swap`; import `colors_and_type.css` (or map its variables into your styling system).
- [ ] Header: SVG wordmark 24 px tall, heart icon ("Repeat offenders") in a 48 px target. Phosphor Bold icons.
- [ ] Tape strips: white, no radius, no shadow. Only five things tilt: headline −2.5°, quote −2°, result card +1°, primary button +1.5°, "found it" label −4°.
- [ ] Art bands follow the piece's mode (see `collection.json`):
  - **field:** `object-fit: cover` at its `focus`.
  - **object:** full width, natural height, never cropped.
  - Dark theme uses `night-01` for every band, cropped to the light piece's height. The 404 keeps its scribble, inverted.
- [ ] Credit on every page, bottom-right, 11 px muted: `Art by Banks · {title}` for the piece that screen shows. Plain "Art by Banks" on a page showing several pieces; none on the art page. It links to the art page.
- [ ] Art page: every piece from `collection.json` shown whole in two columns, each with a wall label (title in DynaPuff 13, medium in 11 px muted). Alt text: "{title}, by Banks".
- [ ] Translation pair on results: a lemon crayon swipe behind each matched word (max three, alternating the two swipe images), then the crayon arrow and the "found it" label, then the result card.
- [ ] Screens: home, results, empty results, episode detail, 404, art page, loading, offline, and the share card / OG image (1200 × 630).
- [ ] Dark theme is opt-in via `[data-theme="dark"]` from the toggle, remembered on the device; never from `prefers-color-scheme`. Tape stays white with ink text, the primary button flips to paper, the crayon arrow inverts.
- [ ] Copy exactly as in the screens and the spec's Voice section. No exclamation marks in UI.

## Acceptance checks

- Text contrast 4.5:1 or better in both themes (the spec lists the pairs). Focus ring: 2 px ink outline, offset 3 px.
- No horizontal scroll at 375 px; tap targets 48 px or larger.
- No `box-shadow`, no rounded corners except the mic button's tap circle.
- Lemon appears only behind matched words.
- No handwritten "Banks" signature anywhere in the UI (the art files are already retouched).
- Print piece 10, Crayon and Stickers, is deliberately not included (TV-character stickers). Don't add it.
- Episode thumbnails are the official images, 16:9, no radius, no filters.

## Not included

Earlier directions, archived versions, procedural art recipes and review notes stay with the brand owner. So do the full-resolution art masters (`<id>.jpg`, about 2900 × 3600): DESIGN.md mentions them, but the web build only needs the 1600 px files here. Nothing in this zip depends on what's left out.
