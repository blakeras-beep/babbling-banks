# Prompt: audit and expand the episode catalog

Paste everything below the line into a new Claude Code session opened on the
`blakeras-beep/babbling-banks` repository. Fill in the two bracketed choices first.

---

You are working in the Babbling Banks repository, a Vite + React app that helps parents identify toddler TV episodes from vague descriptions ("the one where the dog freezes dad" → Bluey, Magic Xylophone). Read `README.md`, `docs/GUIDE.md` and `CONTRIBUTING.md` first; they explain the data model, scripts and workflow. Work on a new branch and open a pull request at the end. Do not push to `main` directly.

## The catalog

- `src/data/shows.json` holds show metadata. `src/data/episodes/<show>.json` holds one array of episodes per show. `src/data/index.js` assembles them.
- Each episode has `id`, `show`, `season`, `episode`, optional `segment`, `title`, `platform`, `shortDescription`, `fullSynopsis`, `characters`, `settings`, `objects`, `themes`, `aliases`, optional `songs`/`videoId`/`duration`/`platformUrl`, and `source`.
- `aliases` is the most important field: the ways a tired parent or a two-year-old would describe the episode. Search quality depends on it.
- `npm run validate-catalog` checks structure. `npm test` pins search behaviour for known queries. Both must pass before you commit.

Current state: 805 episodes across 6 shows. Bluey (154, from Wikipedia) and Curious George (216, Wikipedia/Hulu) are reliable. Sesame Street (325), Daniel Tiger's Neighborhood (64) and Mickey Mouse Funhouse (26) were AI-generated and are flagged with `"source": "AI Generated"`. Ms Rachel (20 YouTube videos with song timestamps) came from YouTube.

## Part 1: audit

Treat the AI-generated shows as suspect until verified.

1. Measure first. Write a small throwaway script that reports, per show: duplicate titles, near-duplicate synopses, episodes whose season/episode numbering is implausible for that show, empty or tiny alias lists, aliases that are just the title repeated, and characters that do not belong to the show. Known starting points: Sesame Street has 112 titles that repeat across seasons, Daniel Tiger has 6, Mickey Mouse Funhouse and Curious George have 1 each.
2. Verify against real sources where you can (Wikipedia episode lists, PBS Kids, Disney, Sesame Workshop, Fandom wikis). If network access is restricted in your session, say so and fall back to internal consistency plus your own knowledge, and mark anything you could not verify.
3. Fix what is wrong in place in the JSON. Remove entries that are fabricated or exact duplicates. Merge near-duplicates keeping the better synopsis and the union of aliases. Correct season/episode numbers when you are confident. Keep ids stable for episodes that stay, because favorites reference them; if an id must change, say so in the PR description.
4. Improve aliases everywhere, including the reliable shows: add "the one where…", "the one with the…", key objects, nicknames, likely misspellings, and what the toddler would shout. Aim for 10 to 20 good aliases per episode. Lower-case, no punctuation.
5. Update `source` honestly: `"Wikipedia"`, `"PBS Kids"`, `"Verified by hand"`, or leave `"AI Generated"` for entries you could not check.
6. Add a test in `src/lib/search.test.js` for every query you fixed, in the form "query X returns episode Y first".

## Part 2: expand

Add [TWO or THREE] new shows. Pick from, in priority order: Peppa Pig, PAW Patrol, CoComelon, Blue's Clues & You!, Gabby's Dollhouse, Trash Truck, Thomas & Friends, Bubble Guppies, Blippi. Confirm the choice with me before generating if any of these feel wrong.

- Preferred path when `ANTHROPIC_API_KEY` is available: `npm run generate-catalog -- --show=<id> --seasons=<range>`. The script has presets for most of the shows above and writes the file, sorts it and registers the show. Prefer `--titles=<file>` seeded from a real episode list for accuracy. Then import the new file in `src/data/index.js`.
- If no API key is available, build the show by hand from public episode lists, season by season, with the same field set, and mark `source` accordingly. Fewer accurate episodes beat many invented ones.
- For each new show also add `keywords` in `shows.json` (how toddlers refer to the show: "the pig", "the puppies", "the dolls") and an emoji, colour, platform and `platformUrl`.
- Keep each show file under roughly 1 MB; the whole catalog ships in one JavaScript chunk.

## Finishing

- Run `npm run check` (lint, format, validate, tests, build). Fix anything it reports.
- Run `npm run dev`, search for ten toddler-style descriptions across old and new shows, and note any that miss. Improve aliases or the synonym table in `src/lib/text.js` until they hit, with a test for each.
- Update the catalog table in `README.md` with the new counts and sources.
- Open a pull request titled "Catalog: audit <shows> and add <shows>". In the description list: episodes removed and why, ids changed, shows added with episode counts, what could not be verified, and the search queries you added tests for.
- Do not commit `.env`, API keys, or scratch scripts; put throwaway analysis under `scripts/.cache/` (ignored) or delete it.

[OPTIONAL: I will review the PR before merge. / Merge it yourself once CI and the Vercel preview are green.]
