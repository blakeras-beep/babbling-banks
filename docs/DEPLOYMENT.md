# Deployment

Babbling Banks is a static Vite site hosted on **Vercel**, with an optional
**Supabase** backend for accounts and synced favorites.

## One-time: connect Vercel to GitHub

The Vercel project `babbling-banks` (team "Blake's projects") currently deploys
from uploads made with the Vercel CLI. To deploy from this repository instead:

1. Open the project in Vercel → **Settings → Git**.
2. Click **Connect Git Repository**, pick GitHub, and choose
   `blakeras-beep/babbling-banks`. Install the Vercel GitHub app on the
   repository if asked.
3. Set the **Production Branch** to `main`.
4. Under **Settings → General**, confirm:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Node.js version: **22.x** (20.x also works)

   `vercel.json` in the repo sets the same values plus the SPA rewrite that
   makes `/episode/...` links work on refresh.
5. Under **Settings → Environment Variables**, add for *Production* and *Preview*:

   | Name                     | Value                                  |
   | ------------------------ | -------------------------------------- |
   | `VITE_SUPABASE_URL`      | Supabase → Project Settings → API      |
   | `VITE_SUPABASE_ANON_KEY` | the anon / publishable key             |

   Without these the site still works, but without sign-in. (The CLI deploys
   read them from a local `.env`; GitHub deploys cannot, so they must be set here.)
6. Push to `main` (or click **Redeploy**). Every pull request now gets a preview URL.

The custom domain `babblingbanks.com` is already attached to the project and
needs no change.

## Day-to-day

- Push to `main` → production deploy.
- Open a pull request → preview deploy + GitHub Actions CI (lint, catalog
  validation, tests, build).
- Rollbacks: Vercel → Deployments → previous deployment → **Promote to Production**.

## Supabase

1. Create a project at <https://supabase.com>.
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Authentication → **URL Configuration**: set the Site URL to
   `https://babblingbanks.com` and add `http://localhost:3000` to the redirect
   list so password-reset links work in both places.
4. Authentication → **Providers → Email**: keep "Confirm email" on.

The app only ever uses the anon/publishable key in the browser. Row-level
security in the schema guarantees users can only read and write their own rows.

## Local production check

```bash
npm run check      # lint + validate + test + build
npm run preview    # serve dist/ on http://localhost:4173
```
