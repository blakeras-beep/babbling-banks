# Babbling Banks

**"What episode is this?"**

A web app that helps parents identify toddler TV episodes from chaotic, vague, or
hilariously incorrect descriptions. Type (or say) _"the one where the dog freezes dad"_
and get _Bluey — Magic Xylophone_.

Live at **[babblingbanks.com](https://babblingbanks.com)**.

## Features

- **Toddler-proof search.** Understands toddler-speak ("doggy", "daddy", "choo choo"),
  misspellings ("xilaphone"), and vague descriptions. The words that matched get a crayon swipe.
- **Voice input.** Tap the microphone and repeat what your toddler said.
- **Follow-up questions.** When results are close, the app asks "Which show?" or
  "Who was in it?" to narrow things down.
- **Browse by show and season.** Every show has its own page with season tabs and
  an in-show search.
- **Episode pages you can share.** Each episode has a permanent link with synopsis,
  characters, themes, songs (with YouTube timestamps), a "Watch on…" button and
  related episodes.
- **Favorites that work without an account.** Favorites are saved on your device
  instantly. Sign in to sync them across devices; device favorites are merged into
  your account automatically.
- **Night mode.** Light is the standard; the "night" switch bottom-left turns on the dark theme and the choice is remembered on your device.
- **Art by Banks.** Every picture in the app was made by the toddler it is named for; the
  credit on each screen links to the collection at `/art`.
- **Installable.** Add it to your phone's home screen like an app.

## Catalog

| Show                          | Episodes | Seasons | Source                                   |
| ----------------------------- | -------: | ------- | ---------------------------------------- |
| Bluey                         |      154 | 1–3     | Wikipedia (numbering re-verified)        |
| Curious George                |      216 | 1–9     | Wikipedia / Hulu                         |
| Sesame Street                 |      123 | 53–56   | Titles verified; descriptions AI-written |
| Daniel Tiger's Neighborhood   |      116 | 1–2     | Titles verified; descriptions AI-written |
| Mickey Mouse Funhouse         |      108 | 1–2     | Titles verified; descriptions AI-written |
| Peppa Pig                     |      104 | 1–2     | Titles verified; descriptions AI-written |
| PAW Patrol                    |       96 | 1–2     | Titles verified; descriptions AI-written |
| Blue's Clues & You!           |       86 | 1–4     | Episode guides; descriptions AI-written  |
| Trash Truck                   |       29 | 1–2     | Episode guides; descriptions AI-written  |
| Ms Rachel (Songs for Littles) |       20 | –       | YouTube                                  |

Sesame Street also includes five landmark classic episodes, and Trash Truck includes its
Christmas special. For Blue's Clues & You! and Trash Truck, titles, order and plot summaries
come from Wikipedia, TheTVDB, TVmaze and fan wikis (via web search), and Claude wrote the
descriptions and aliases from those summaries. Counts are stories: shows with
two stories per episode (Curious George, Daniel Tiger, Mickey, PAW Patrol) list each one.

Episode pictures come from [TMDB](https://www.themoviedb.org/): `npm run fetch-episode-images`
matches each episode to its TMDB still (by title, then by number) and falls back to the
show's backdrop. This product uses the TMDB API but is not endorsed or certified by TMDB.

AI-generated entries are flagged on the episode page. Corrections are very welcome:
open an issue or a pull request that edits the JSON under `src/data/episodes/`.

## Quick start

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/blakeras-beep/babbling-banks.git
cd babbling-banks
npm install
npm run dev
```

Open <http://localhost:3000>. Search and favorites work immediately without any
configuration. Accounts and synced favorites need Supabase (see below).

### Optional: accounts with Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.
3. In **Project Settings → API**, copy the project URL and the anon/publishable key.
4. Copy `.env.example` to `.env` and fill in the two `VITE_SUPABASE_*` values.
5. Restart `npm run dev`. A **Sign in** button appears in the header.

The same two variables must be set in Vercel for the production site
(see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Scripts

| Command                        | What it does                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `npm run dev`                  | Start the dev server with hot reload                                                         |
| `npm run build`                | Production build into `dist/`                                                                |
| `npm run preview`              | Serve the production build locally                                                           |
| `npm test`                     | Run the unit tests (search engine, catalog)                                                  |
| `npm run lint`                 | ESLint                                                                                       |
| `npm run format`               | Prettier (write)                                                                             |
| `npm run validate-catalog`     | Check every episode file against the catalog schema                                          |
| `npm run generate-catalog`     | Add a show to the catalog with Claude (needs an API key)                                     |
| `npm run fetch-episode-images` | Backfill episode thumbnails from TMDB into `src/data/episode-images.json` (needs a TMDB key) |
| `npm run generate-og-image`    | Re-render the 1200 × 630 share card to `public/og-image.png`                                 |
| `npm run screenshots`          | Screenshot every screen (375 and 1440, light and dark)                                       |
| `npm run check`                | Everything CI runs: lint, validate, test, build                                              |

## Project structure

```
.
├── index.html                 # HTML entry (meta tags, critical CSS, theme bootstrap)
├── brand/                     # The brand kit (DESIGN.md is the source of truth)
├── public/
│   ├── art/                   # Banks' pieces and the crayon marks
│   ├── fonts/                 # Self-hosted woff2
│   ├── logo/                  # Wordmark and app icon SVGs
│   └── …                      # Icons, manifest, share card
├── scripts/
│   ├── generate-catalog.mjs   # Add a show to the catalog using the Claude API
│   ├── validate-catalog.mjs   # Schema + consistency checks for the catalog
│   ├── fetch-episode-images.mjs # Backfill thumbnails from TMDB (matching logic in lib/)
│   ├── generate-og-image.mjs  # Render the share card with the brand fonts and art
│   └── screenshot-screens.mjs # Screenshot every screen for review against the kit
├── supabase/schema.sql        # Database tables and row-level-security policies
├── src/
│   ├── main.jsx               # React entry: router + providers
│   ├── App.jsx                # Routes
│   ├── components/            # Reusable UI (EpisodeCard, SearchBox, AuthModal, …)
│   ├── pages/                 # One component per route
│   ├── hooks/                 # useSpeechRecognition, useDocumentTitle
│   ├── lib/
│   │   ├── search.js          # The search engine (pure functions, unit tested)
│   │   ├── text.js            # Normalisation, synonyms, stemming, fuzzy matching
│   │   ├── platforms.js       # Where-to-watch links and formatting helpers
│   │   ├── supabase.js        # Supabase client (optional) and data helpers
│   │   ├── storage.js         # localStorage wrapper (favorites, theme, recents)
│   │   ├── AuthContext.jsx    # Auth + favorites state
│   │   └── ThemeContext.jsx   # Light / dark / system theme
│   ├── data/
│   │   ├── shows.json         # Show metadata
│   │   ├── episodes/*.json    # One file per show
│   │   ├── art-collection.json# Banks' pieces: titles, media, modes, focus points
│   │   ├── episode-images.json# Episode stills and show backdrops from TMDB
│   │   └── index.js           # Assembles the catalog
│   └── styles/                # tokens.css (from the kit), reset (global.css), components (app.css)
└── .github/workflows/ci.yml   # Lint, validate, test, build on every push and PR
```

### Routes

| Path            | Page                          |
| --------------- | ----------------------------- |
| `/`             | Search (query lives in `?q=`) |
| `/shows`        | All shows                     |
| `/show/:showId` | One show, grouped by season   |
| `/episode/:id`  | Episode detail                |
| `/favorites`    | Repeat offenders (saved)      |
| `/art`          | Art by Banks                  |

## Data model

Each file in `src/data/episodes/` is an array of episodes:

```jsonc
{
  "id": "bluey-s1e1", // unique, stable; used in URLs and favorites
  "show": "bluey", // key in shows.json (must match the file name)
  "season": 1,
  "episode": 1,
  "segment": "A", // optional, for two-stories-per-episode shows
  "title": "Magic Xylophone",
  "platform": "Disney+",
  "platformUrl": "https://…", // optional; direct link to watch
  "videoId": "dv2PkDPu8Zs", // optional; YouTube only
  "duration": 119, // optional; minutes
  "shortDescription": "…",
  "fullSynopsis": "…",
  "characters": ["Bluey", "Bingo", "Bandit"],
  "settings": ["Home"],
  "objects": ["Xylophone"],
  "themes": ["Sharing"],
  "aliases": ["freeze dad", "frozen daddy", "xilophone"], // how parents describe it
  "songs": [{ "title": "Hello Song", "timestamp": "0:00" }], // optional
  "source": "Wikipedia",
}
```

The **aliases** array is what makes search work on toddler descriptions, so
add plenty: misspellings, "the one where…", nicknames, key objects.

### Adding a show

**By hand:** add the show to `src/data/shows.json`, create
`src/data/episodes/<showId>.json`, import it in `src/data/index.js`, then run
`npm run validate-catalog`.

**With Claude:** set `ANTHROPIC_API_KEY` in `.env` and run

```bash
npm run generate-catalog -- --show=peppa_pig --seasons=1-2
```

The script lists the episodes, writes descriptions and aliases, saves the file,
and registers the show. See the top of `scripts/generate-catalog.mjs` for
options, including seeding from your own list of titles for better accuracy.

## Search engine

`src/lib/search.js` scores every episode against the query:

1. The query and all catalog text are **canonicalised**: lower-cased, punctuation
   stripped, stopwords removed, toddler synonyms applied (`daddy → dad`,
   `choo choo → train`), and lightly stemmed.
2. Fields are scored with different weights: exact title > alias > song > character
   > object > theme/setting > description. Typos are tolerated with an edit-distance
   > check scaled to word length.
3. A **coverage bonus** rewards results that match every word of the query, and
   results that match only a small slice of a long query are damped.
4. If the top results are close, **follow-up questions** are generated from the
   shows, characters and settings that would separate them.

Tests in `src/lib/search.test.js` pin the behaviour for well-known queries.

## Deployment

The site is hosted on Vercel. Pushing to `main` deploys production once the
Vercel project is connected to this repository. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the one-time setup.

## Contributing

See [docs/GUIDE.md](docs/GUIDE.md) for the operator's guide (daily workflow, API keys,
generating shows, Supabase, Vercel) and [CONTRIBUTING.md](CONTRIBUTING.md). The quickest wins are catalog fixes and
new aliases, which need no code at all.

## License

Private project. Show names and episode descriptions belong to their respective owners.

## Brand

The look is Babbling Banks v1.5, "Banks Originals": the kit lives in
`brand/babbling-banks-brand-v1.5/` and `DESIGN.md` there is the source of truth.
`src/styles/tokens.css` is the kit's `colors_and_type.css` with the asset URLs pointed at
`public/`; regenerate it from the kit rather than editing values by hand. Rules that are
easy to miss: only five things tilt, no shadows, no rounded corners except the mic
button, lemon only behind matched words, and no exclamation marks in the UI.
