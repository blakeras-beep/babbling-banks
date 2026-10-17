#!/usr/bin/env node
/**
 * Validates the episode catalog in src/data.
 *
 *   npm run validate-catalog
 *
 * Checks every episode file against the schema below, makes sure ids are
 * unique, that every episode belongs to a known show and that the file is
 * sorted by season/episode. Exits non-zero on the first problem list.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '..', 'src', 'data');
const episodesDir = path.join(dataDir, 'episodes');

const REQUIRED_STRING = [
  'id',
  'show',
  'title',
  'platform',
  'shortDescription',
  'fullSynopsis',
  'source',
];
const ARRAY_OF_STRINGS = ['characters', 'settings', 'objects', 'themes', 'aliases'];
const OPTIONAL = new Set(['segment', 'platformUrl', 'videoId', 'duration', 'songs', 'imageUrl']);
const KNOWN_KEYS = new Set([
  ...REQUIRED_STRING,
  ...ARRAY_OF_STRINGS,
  'season',
  'episode',
  ...OPTIONAL,
]);

const BANNED_WORDS = [
  'elevate',
  'seamless',
  'unlock',
  'empower',
  'journey',
  'magic',
  'magical',
  'smart',
  'AI-powered',
  'mommy',
  'mama',
  'engaging',
];

const problems = [];
const report = (file, message) => problems.push(`${file}: ${message}`);

const shows = JSON.parse(fs.readFileSync(path.join(dataDir, 'shows.json'), 'utf8'));
for (const [id, show] of Object.entries(shows)) {
  if (show.id !== id) report('shows.json', `show "${id}" has mismatched id "${show.id}"`);
  for (const key of ['name', 'emoji', 'description', 'color', 'platform']) {
    if (typeof show[key] !== 'string' || !show[key])
      report('shows.json', `show "${id}" is missing "${key}"`);
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(show.color ?? ''))
    report('shows.json', `show "${id}" has an invalid color`);
  // Show copy the app renders follows the brand's banned-word list (DESIGN.md, Voice & Tone).
  for (const key of ['name', 'description']) {
    const hit = BANNED_WORDS.find((word) => new RegExp(`\\b${word}\\b`, 'i').test(show[key] ?? ''));
    if (hit) report('shows.json', `show "${id}" ${key} uses the banned word "${hit}"`);
  }
}

const files = fs
  .readdirSync(episodesDir)
  .filter((name) => name.endsWith('.json'))
  .sort();
const seenIds = new Set();
let total = 0;

for (const file of files) {
  const showId = file.replace(/\.json$/, '');
  if (!shows[showId]) report(file, `no entry in shows.json for show "${showId}"`);
  let episodes;
  try {
    episodes = JSON.parse(fs.readFileSync(path.join(episodesDir, file), 'utf8'));
  } catch (error) {
    report(file, `invalid JSON: ${error.message}`);
    continue;
  }
  if (!Array.isArray(episodes)) {
    report(file, 'must be a JSON array of episodes');
    continue;
  }

  let previousKey = null;
  episodes.forEach((episode, index) => {
    const label = `${file}[${index}] (${episode?.id ?? 'no id'})`;
    if (!episode || typeof episode !== 'object') return report(label, 'is not an object');
    for (const key of REQUIRED_STRING) {
      if (typeof episode[key] !== 'string' || !episode[key].trim())
        report(label, `missing required string "${key}"`);
    }
    for (const key of ARRAY_OF_STRINGS) {
      if (
        !Array.isArray(episode[key]) ||
        episode[key].some((v) => typeof v !== 'string' || !v.trim())
      ) {
        report(label, `"${key}" must be an array of non-empty strings`);
      }
    }
    if (!Number.isInteger(episode.season) || episode.season < 0)
      report(label, '"season" must be a non-negative integer');
    if (!Number.isInteger(episode.episode) || episode.episode < 0)
      report(label, '"episode" must be a non-negative integer');
    if (episode.show !== showId)
      report(label, `show "${episode.show}" does not match file "${showId}"`);
    if (seenIds.has(episode.id)) report(label, 'duplicate id');
    seenIds.add(episode.id);
    if (episode.aliases?.length === 0)
      report(label, 'should have at least one alias (how parents describe it)');
    if (episode.songs !== undefined) {
      if (!Array.isArray(episode.songs)) report(label, '"songs" must be an array');
      else {
        for (const song of episode.songs) {
          if (typeof song?.title !== 'string') report(label, 'every song needs a "title"');
          if (song?.timestamp && !/^\d{1,2}(:\d{2}){1,2}$/.test(song.timestamp))
            report(label, `bad song timestamp "${song.timestamp}"`);
        }
      }
    }
    if (
      episode.duration !== undefined &&
      (!Number.isInteger(episode.duration) || episode.duration <= 0)
    ) {
      report(label, '"duration" must be a positive integer (minutes)');
    }
    if (episode.videoId !== undefined && !/^[\w-]{6,}$/.test(episode.videoId))
      report(label, 'invalid "videoId"');
    for (const key of Object.keys(episode))
      if (!KNOWN_KEYS.has(key)) report(label, `unknown field "${key}"`);

    const key = [episode.season, episode.episode, episode.segment ?? ''];
    if (previousKey) {
      const [ps, pe, pseg] = previousKey;
      const ordered =
        key[0] > ps || (key[0] === ps && (key[1] > pe || (key[1] === pe && key[2] >= pseg)));
      if (!ordered) report(label, 'episodes must be sorted by season, episode, segment');
    }
    previousKey = key;
    return undefined;
  });
  total += episodes.length;
}

// The meta description states the episode count; keep it true as the catalog grows.
const stated = `${total.toLocaleString('en-US')} episodes`;
for (const file of ['index.html']) {
  const text = fs.readFileSync(path.join(here, '..', file), 'utf8');
  if (!text.includes(stated))
    report(file, `meta description must say "${stated}" (update it when the catalog changes)`);
}

if (problems.length) {
  console.error(`✖ Catalog has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const problem of problems.slice(0, 50)) console.error('  - ' + problem);
  if (problems.length > 50) console.error(`  … and ${problems.length - 50} more`);
  process.exit(1);
}
console.log(`✔ Catalog OK: ${total} episodes across ${files.length} shows`);
