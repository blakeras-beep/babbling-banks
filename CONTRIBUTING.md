# Contributing

Thanks for helping parents find that episode faster.

## Fixing or improving catalog data (no code needed)

Episode data lives in `src/data/episodes/<show>.json`. The most useful edits:

- **Add aliases.** Think about how a tired parent or a two-year-old would
  describe the episode: `"the one with the balloon"`, `"frozen daddy"`,
  `"xilophone"`. Misspellings are welcome.
- **Fix descriptions**, characters, settings and themes, especially on entries
  marked `"source": "AI Generated"`.
- **Add `platformUrl`** when you know a direct link.

Then run:

```bash
npm run validate-catalog
npm test
```

## Adding a show

See "Adding a show" in the README. Keep one file per show, keep episodes
sorted by season/episode, and give every episode at least a handful of aliases.

## Code changes

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # what CI runs
```

- The search engine (`src/lib/search.js`, `src/lib/text.js`) is pure and
  unit-tested. If you change ranking, add or adjust a test in
  `src/lib/search.test.js` that shows the query you improved.
- UI uses plain CSS with the design tokens in `src/styles/global.css`.
  Prefer a class in `src/styles/app.css` over inline styles.
- Run `npm run format` before committing.

## Pull requests

Open a PR against `main`. CI runs lint, catalog validation, tests and the
production build; Vercel posts a preview URL.
