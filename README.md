# Babbling Banks

**"What episode is this?"**

A web app that helps parents identify toddler TV episodes from chaotic, vague, or
hilariously incorrect descriptions. Type (or say) *"the one where the dog freezes dad"*
and get *Bluey — Magic Xylophone*.

Live at **[babblingbanks.com](https://babblingbanks.com)**.

## Features

- **Toddler-proof search.** Understands toddler-speak ("doggy", "daddy", "choo choo"),
  misspellings ("xilaphone"), and vague descriptions. Every result says *why* it matched.
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
- **Dark mode** that follows your system setting, with a manual toggle.
- **Installable.** Add it to your phone's home screen like an app.

## Catalog

| Show                       | Episodes | Source           |
| -------------------------- | -------: | ---------------- |
| Bluey                      |      154 | Wikipedia        |
| Curious George             |      216 | Wikipedia / Hulu |
| Sesame Street              |      325 | AI generated     |
| Daniel Tiger's Neighborhood|       64 | AI generated     |
| Mickey Mouse Funhouse      |       26 | AI generated     |
| Ms Rachel (Songs for Littles) |    20 | YouTube          |

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

| Command                    | What it does                                               |
| -------------------------- | ---------------------------------------------------------- |
| `npm run dev`              | Start the dev server with hot reload                       |
| `npm run build`            | Production build into `dist/`                              |
| `npm run preview`          | Serve the production build locally                         |
| `npm test`                 | Run the unit tests (search engine, catalog)                |
| `npm run lint`             | ESLint                                                     |
| `npm run format`           | Prettier (write)                                           |
| `npm run validate-catalog` | Check every episode file against the catalog schema        |
| `npm run generate-catalog` | Add a show to the catalog with Claude (needs an API key)   |
| `npm run check`            | Everything CI runs: lint, validate, test, build            |

## Project structure

```
.
├── index.html                 # HTML entry (meta tags, critical CSS, theme bootstrap)
├── public/                    # Static assets: logo, icons, manifest, OG image
├── scripts/
│   ├── generate-catalog.mjs   # Add a show to the catalog using the Claude API
│   └── validate-catalog.mjs   # Schema + consistency checks for the catalog
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
│   │   └── index.js           # Assembles the catalog
│   └── styles/                # Design tokens (global.css) and component styles (app.css)
└── .github/workflows/ci.yml   # Lint, validate, test, build on every push and PR
```

### Routes

| Path             | Page                                   |
| ---------------- | -------------------------------------- |
| `/`              | Search (query lives in `?q=`)          |
| `/shows`         | All shows                              |
| `/show/:showId`  | One show, grouped by season            |
| `/episode/:id`   | Episode detail                         |
| `/favorites`     | Saved episodes                         |

## Data model

Each file in `src/data/episodes/` is an array of episodes:

```jsonc
{
  "id": "bluey-s1e1",            // unique, stable; used in URLs and favorites
  "show": "bluey",               // key in shows.json (must match the file name)
  "season": 1,
  "episode": 1,
  "segment": "A",                // optional, for two-stories-per-episode shows
  "title": "Magic Xylophone",
  "platform": "Disney+",
  "platformUrl": "https://…",    // optional; direct link to watch
  "videoId": "dv2PkDPu8Zs",      // optional; YouTube only
  "duration": 119,               // optional; minutes
  "shortDescription": "…",
  "fullSynopsis": "…",
  "characters": ["Bluey", "Bingo", "Bandit"],
  "settings": ["Home"],
  "objects": ["Xylophone"],
  "themes": ["Sharing"],
  "aliases": ["freeze dad", "frozen daddy", "xilophone"],  // how parents describe it
  "songs": [{ "title": "Hello Song", "timestamp": "0:00" }], // optional
  "source": "Wikipedia"
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
   check scaled to word length.
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

See [CONTRIBUTING.md](CONTRIBUTING.md). The quickest wins are catalog fixes and
new aliases, which need no code at all.

## License

Private project. Show names and episode descriptions belong to their respective owners.
