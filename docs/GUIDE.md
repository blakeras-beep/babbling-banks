# Babbling Banks operator's guide

Everything you need to run, change and grow Babbling Banks, written for someone
who is new to this kind of setup. The short version:

```
edit files  →  git push  →  Vercel builds it  →  babblingbanks.com updates
```

If you only read one section, read [The daily loop](#the-daily-loop).

---

## The daily loop

1. **Run it locally**

   ```bash
   npm install        # first time only
   npm run dev        # opens http://localhost:3000
   ```

   Search and favorites work with no setup. Sign-in needs the Supabase values in
   `.env` (see [Keys and where they live](#keys-and-where-they-live)).

2. **Change something.** Edit a file; the browser reloads itself.

3. **Check it the way CI will**

   ```bash
   npm run check      # lint + catalog validation + tests + production build
   ```

4. **Ship it**

   ```bash
   git add -A
   git commit -m "Add aliases for Bluey season 3"
   git push
   ```

   Pushing to `main` deploys **production** (babblingbanks.com) in about a minute.
   Pushing any other branch and opening a pull request deploys a **preview** with
   its own URL, and runs CI. Merge the PR when the preview looks right.

5. **Something broke in production?** Vercel → Deployments → pick the last good
   one → **Promote to Production**. Takes seconds, no rebuild.

---

## Keys and where they live

| Key                      | Used for                                         | Local (`.env`) | Vercel (Settings → Environment Variables) |
| ------------------------ | ------------------------------------------------ | :------------: | :---------------------------------------: |
| `VITE_SUPABASE_URL`      | Accounts and synced favorites                    |      yes       |                 yes (set)                 |
| `VITE_SUPABASE_ANON_KEY` | Same. A _publishable_ key, safe in the browser   |      yes       |                 yes (set)                 |
| `ANTHROPIC_API_KEY`      | Only `npm run generate-catalog` on your computer |      yes       |        **no, never** (not needed)         |

Rules of thumb:

- `.env` is ignored by git. Never commit it. `.env.example` shows the shape.
- Anything starting with `VITE_` is compiled into the public JavaScript. That is
  fine for the Supabase publishable key (row-level security protects the data)
  and would be a disaster for an Anthropic key. The generator reads
  `ANTHROPIC_API_KEY` without the `VITE_` prefix for exactly this reason.
- Changing a variable in Vercel does **not** change the live site until the next
  deployment. Push a commit or click **Redeploy**.

---

## Adding shows with the Claude API

The catalog generator asks Claude to list a show's episodes and then write
descriptions, characters, themes and, most importantly, **aliases**: the ways a
tired parent or a toddler would describe each episode. That alias list is what
makes search work.

### One-time setup

1. Create an API key at <https://console.anthropic.com> (API Keys → Create Key)
   and add a small amount of credit under Billing.
2. Put it in `.env`:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### Generate a show

```bash
# A show the script already knows about (see the preset list below)
npm run generate-catalog -- --show=peppa_pig

# Only some seasons, smaller batches if responses get cut off
npm run generate-catalog -- --show=paw_patrol --seasons=1-3 --batch=10

# Preview without writing any files
npm run generate-catalog -- --show=peppa_pig --seasons=1 --dry-run

# A show with no preset: describe it on the command line
npm run generate-catalog -- --show=gabbys_dollhouse --name="Gabby's Dollhouse" \
  --platform="Netflix" --emoji="🐱" --color="#F48FB1" \
  --description="Gabby shrinks down to play in her dollhouse with the Gabby Cats" --seasons=1-2
```

Presets with sensible colours, platforms and season counts: `peppa_pig`,
`paw_patrol`, `cocomelon`, `blues_clues`, `thomas_tank_engine`, `trash_truck`,
`bubble_guppies`, `blippi`. Run `npm run generate-catalog` with no arguments to
see the full help.

The script:

1. Asks Claude for the episode list, one season at a time.
2. Describes episodes in batches and matches them back by title.
3. Writes `src/data/episodes/<show>.json`, sorted, skipping any episode ids that
   already exist, so re-running only fills gaps.
4. Adds the show to `src/data/shows.json` if it is new.

Then you finish it by hand:

```bash
# 1. Register the file (only for a brand-new show)
#    Open src/data/index.js, import './episodes/<show>.json' and add it to EPISODES.
# 2. Check it
npm run validate-catalog
npm test
# 3. Look at it
npm run dev           # open the show page, search for a few episodes
# 4. Ship it
git add -A && git commit -m "Add Peppa Pig seasons 1-2" && git push
```

### Seeding from your own episode list (more accurate)

Claude is good at well-known shows but can invent episodes for obscure ones.
If you have a trustworthy list (Wikipedia, the network's site), save it as JSON
and let the script only write the descriptions:

```json
[
  { "season": 1, "episode": 1, "title": "Muddy Puddles" },
  { "season": 1, "episode": 2, "title": "Mr Dinosaur is Lost" },
  { "season": 1, "episode": 3, "segment": "A", "title": "Best Friend" }
]
```

```bash
npm run generate-catalog -- --show=peppa_pig --titles=./peppa-s1.json
```

### What it costs

The script uses `claude-opus-5-5` (US$4 per million input tokens, US$20 per
million output tokens at the time of writing). A 50-episode show is roughly
30,000 output tokens, so expect **well under US$1 per show**; a 200-episode show
is a few dollars. `--dry-run` costs the same as a real run (the API call still
happens), so use `--seasons=1` to test cheaply.

Pass `--model=claude-sonnet-5-5` for a cheaper, slightly less careful run.

### If something goes wrong

| Message                                       | What to do                                                  |
| --------------------------------------------- | ----------------------------------------------------------- |
| `Set ANTHROPIC_API_KEY…`                      | Add the key to `.env` in the project folder                 |
| `Invalid ANTHROPIC_API_KEY`                   | Copy it again from the console; keys start `sk-ant-`        |
| `Rate limited`                                | Wait a minute and re-run; finished episodes are skipped     |
| `Response was cut off; try a smaller --batch` | Re-run with `--batch=8`                                     |
| `Claude declined this request`                | Rare for kids' TV; re-run, or seed titles with `--titles`   |
| `0/15 matched`                                | Claude renamed titles; re-run, it usually matches next time |

Everything the generator writes gets `"source": "AI Generated"` and the episode
page shows a "may not be exact" note. Review before you commit, and fix anything
odd directly in the JSON.

---

## Editing the catalog by hand

The files under `src/data/episodes/` are plain JSON. The most valuable edits need
no code at all:

- **Add aliases.** How would a two-year-old say it? `"the one with the balloon"`,
  `"frozen daddy"`, `"xilophone"`. Lower-case, no punctuation.
- **Fix a synopsis** on an AI-generated entry.
- **Add a direct link** in `platformUrl`.

Keep each file sorted by season and episode, then run
`npm run validate-catalog`. The README's "Data model" section lists every field.

Search behaviour itself lives in `src/lib/search.js` (scoring) and
`src/lib/text.js` (toddler synonyms such as `doggy → dog`). Adding a synonym is
a one-line change in the `SYNONYMS` table; add a test in
`src/lib/search.test.js` for the query you improved.

---

## Supabase (accounts and favorites)

Dashboard: <https://supabase.com/dashboard> → project `babbling-banks`.

- **Table Editor → favorites** shows who saved what. Each row is one user and
  one episode id. Users can only ever read or change their own rows; the rules
  are in `supabase/schema.sql`.
- **Authentication → Users** lists sign-ups. Delete a user there to remove them
  and their favorites.
- **Authentication → URL Configuration** must list
  `https://babblingbanks.com` as the Site URL and `http://localhost:3000` as an
  extra redirect, or password-reset emails will link to the wrong place.
- **SQL Editor** is where you run `supabase/schema.sql` after changing it. The
  file is safe to run repeatedly.
- **Project Settings → API** is where the two `VITE_SUPABASE_*` values come from.
  If you ever rotate the key, update it in both `.env` and Vercel, then redeploy.

The app does not need Supabase to run. If the values are missing it hides the
Sign in button and keeps favorites on the device.

---

## Vercel (hosting)

Dashboard: <https://vercel.com/blakes-projects-a0a21a1e/babbling-banks>.

- **Deployments** lists every build. Each has a unique URL you can share. The
  Git column shows which commit it came from.
- **Preview vs production.** Commits on `main` go to production and
  babblingbanks.com. Commits on other branches get preview URLs. Preview URLs
  require signing in to Vercel (Deployment Protection); the custom domain does not.
- **Rollback:** open an older deployment → **Promote to Production**.
- **Build failed?** Open the deployment → Build Logs. Nearly always it is a lint
  or test failure that `npm run check` would have caught locally.
- **Logs** show runtime errors. There is no server code in this app, so this is
  mostly empty.
- **Settings → Environment Variables** is the only place production keys live.
- **Settings → Domains** manages babblingbanks.com. Nothing to do here normally.

Node version is 24 on Vercel and 22 in CI; both work. `vercel.json` carries the
rewrite that makes `/episode/...` links load on refresh. Do not delete it.

---

## GitHub (code and CI)

Repository: <https://github.com/blakeras-beep/babbling-banks>.

- **Actions** tab shows CI for every push and pull request: lint, formatting,
  catalog validation, tests, build. A red X links to the exact failing step.
- **Pull requests** are the safe way to try bigger changes: push a branch, open
  a PR, wait for the green check and the Vercel preview link, then merge.
- **Issues** is where the app's "Spotted a mistake? Let us know" links point.
  Nothing fancy: a title and a sentence is enough.

Useful git commands:

```bash
git status                    # what changed
git switch -c fix-aliases     # start a branch
git push -u origin fix-aliases
git switch main && git pull   # back to main, up to date
```

---

## Troubleshooting

| Symptom                                     | Likely cause / fix                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| Search works but no Sign in button          | `VITE_SUPABASE_*` not set (locally in `.env`, in production in Vercel)     |
| Sign in button appears but sign-in fails    | Wrong key, or Supabase URL configuration missing the site URL              |
| Favorites vanished after signing in         | They were merged into the account; check `/favorites` while signed in      |
| `/episode/...` link gives 404 in production | `vercel.json` rewrite missing; restore it from git                         |
| Push succeeded but site did not change      | Pushed a branch other than `main`, or the build failed (check Deployments) |
| CI red on "format:check"                    | Run `npm run format` and commit                                            |
| `npm run check` passes locally, CI fails    | Usually a file you forgot to `git add`                                     |
| Voice button missing                        | Browser has no speech recognition (Firefox). Chrome, Safari and Edge work  |
