#!/usr/bin/env node
/**
 * Backfill episode thumbnails from TMDB (The Movie Database).
 *
 * For every show in the catalog this looks up the series on TMDB, pulls each
 * season's episode stills, matches them to our episodes (by title, then by
 * number) and writes src/data/episode-images.json. Episodes without a still
 * fall back to the show's 16:9 backdrop, so every card has a picture. Episode
 * JSON files are never touched.
 *
 * Needs a TMDB key, read from the environment or .env (never bundled):
 *   TMDB_API_KEY      a v3 API key, or
 *   TMDB_READ_TOKEN   a v4 "API read access token"
 *
 * Usage:
 *   npm run fetch-episode-images                 # all shows
 *   node scripts/fetch-episode-images.mjs --show=bluey
 *   node scripts/fetch-episode-images.mjs --dry-run   # report, don't write
 *
 * Images are hotlinked from TMDB's CDN per their terms. Attribution ("This
 * product uses the TMDB API but is not endorsed or certified by TMDB") is shown
 * on the shows page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchSeason } from './lib/match-episodes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src/data');
const outFile = path.join(dataDir, 'episode-images.json');

// Load .env (no dependency needed)
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]])
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = true] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const apiKey = process.env.TMDB_API_KEY;
const readToken = process.env.TMDB_READ_TOKEN;
if (!apiKey && !readToken) {
  console.error('Set TMDB_API_KEY (v3) or TMDB_READ_TOKEN (v4) in the environment or .env.');
  process.exit(1);
}

/**
 * How to find each show on TMDB. The search query and first-air year pin the
 * right series; `tmdbId` can be set to skip the search entirely.
 */
const LOOKUP = {
  bluey: { query: 'Bluey', year: 2018 },
  curious_george: { query: 'Curious George', year: 2006 },
  sesame_street: { query: 'Sesame Street', year: 1969 },
  daniel_tiger: { query: "Daniel Tiger's Neighborhood", year: 2012 },
  mickey_mouse_funhouse: { query: 'Mickey Mouse Funhouse', year: 2021 },
  peppa_pig: { query: 'Peppa Pig', year: 2004 },
  paw_patrol: { query: 'PAW Patrol', year: 2013 },
  trash_truck: { query: 'Trash Truck', year: 2020 },
  blues_clues: { query: "Blue's Clues & You!", year: 2019 },
};

const API = 'https://api.themoviedb.org/3';
async function tmdb(endpoint, params = {}) {
  const url = new URL(API + endpoint);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if (apiKey && !readToken) url.searchParams.set('api_key', apiKey);
  const headers = readToken ? { Authorization: `Bearer ${readToken}` } : {};
  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return tmdb(endpoint, params);
  }
  if (!response.ok) throw new Error(`TMDB ${endpoint}: ${response.status} ${response.statusText}`);
  return response.json();
}

async function findSeries(showId, show) {
  const lookup = LOOKUP[showId] ?? { query: show.name };
  if (lookup.tmdbId) return tmdb(`/tv/${lookup.tmdbId}`);
  const search = await tmdb('/search/tv', {
    query: lookup.query,
    ...(lookup.year ? { first_air_date_year: lookup.year } : {}),
  });
  const hit = search?.results?.[0];
  if (!hit) return null;
  return tmdb(`/tv/${hit.id}`);
}

const shows = JSON.parse(fs.readFileSync(path.join(dataDir, 'shows.json'), 'utf8'));
const existing = fs.existsSync(outFile)
  ? JSON.parse(fs.readFileSync(outFile, 'utf8'))
  : { shows: {}, episodes: {} };
const output = {
  source: 'tmdb',
  generatedAt: new Date().toISOString(),
  imageBase: 'https://image.tmdb.org/t/p/',
  shows: { ...existing.shows },
  episodes: { ...existing.episodes },
};

const wanted = args.show ? [args.show] : Object.keys(shows);
const report = [];

for (const showId of wanted) {
  const show = shows[showId];
  if (!show) {
    console.error(`Unknown show "${showId}"`);
    process.exit(1);
  }
  const episodes = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'episodes', `${showId}.json`), 'utf8')
  );
  // YouTube videos already have an official thumbnail.
  const needing = episodes.filter((e) => !(e.platform === 'YouTube' && e.videoId));
  if (needing.length === 0) continue;

  const series = await findSeries(showId, show);
  if (!series) {
    report.push(`${show.name}: not found on TMDB`);
    continue;
  }
  output.shows[showId] = {
    tmdbId: series.id,
    name: series.name,
    backdrop: series.backdrop_path ?? null,
  };

  let stills = 0;
  let fallback = 0;
  const seasons = [...new Set(needing.map((e) => e.season))].sort((a, b) => a - b);
  for (const seasonNumber of seasons) {
    const ours = needing.filter((e) => e.season === seasonNumber);
    const season = await tmdb(`/tv/${series.id}/season/${seasonNumber}`);
    const matches = matchSeason(ours, season?.episodes ?? []);
    for (const { id, still } of matches) {
      if (still) {
        output.episodes[id] = { still };
        stills += 1;
      } else {
        delete output.episodes[id];
        fallback += 1;
      }
    }
  }
  report.push(
    `${show.name.padEnd(32)} TMDB #${series.id}  stills ${String(stills).padStart(3)}  ` +
      `show backdrop ${String(fallback).padStart(3)}${series.backdrop_path ? '' : ' (no backdrop)'}`
  );
}

console.log(report.join('\n'));
const total = Object.keys(output.episodes).length;
console.log(`\n${total} episode stills in ${path.relative(root, outFile)}`);
if (args['dry-run']) {
  console.log('(dry run: nothing written)');
} else {
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n');
}
