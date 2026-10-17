#!/usr/bin/env node
/**
 * Babbling Banks catalog generator.
 *
 * Adds (or extends) a show in src/data using Claude. Two steps:
 *   1. List the episodes for the requested seasons (season, episode, title).
 *   2. For each batch of episodes, write a short description, synopsis,
 *      characters, settings, objects, themes and lots of parent-style aliases.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-catalog.mjs --show=peppa_pig
 *   node scripts/generate-catalog.mjs --show=peppa_pig --seasons=1-2 --batch=15
 *   node scripts/generate-catalog.mjs --show=my_show --name="My Show" --platform="Netflix" \
 *       --titles=./my-show-episodes.json      # seed from your own list for accuracy
 *   node scripts/generate-catalog.mjs --show=peppa_pig --dry-run   # print, don't write
 *
 * --titles expects a JSON array of { "season": 1, "episode": 1, "title": "…", "segment": "A"? }.
 * Each entry may also carry a "summary" taken from a real source (an episode guide);
 * Claude then writes the description from it instead of from memory. Pass
 * --source="…" to label the result (default "AI Generated").
 * Existing episode ids are kept and skipped, so re-running only fills gaps.
 *
 * Everything the model writes is marked "source": "AI Generated" and shown with
 * a disclaimer in the app. Review the output before committing it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const dataDir = path.join(root, 'src', 'data');
const showsPath = path.join(dataDir, 'shows.json');
const episodesDir = path.join(dataDir, 'episodes');

// ---------------------------------------------------------------------------
// Load .env (no dependency needed)
// ---------------------------------------------------------------------------
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]])
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

// ---------------------------------------------------------------------------
// Presets for shows parents ask about most. Anything not listed can be
// described with --name / --platform / --description flags.
// ---------------------------------------------------------------------------
const PRESETS = {
  peppa_pig: {
    name: 'Peppa Pig',
    emoji: '🐷',
    color: '#F28BB1',
    accentColor: '#E2403B',
    platform: 'Paramount+',
    platformUrl: 'https://www.paramountplus.com/shows/peppa-pig/',
    description:
      'Peppa, a cheeky little piggy, lives with her brother George, Mummy Pig and Daddy Pig',
    network: 'Channel 5 / Nick Jr.',
    ageRange: '2-5',
    episodeLength: '5 min',
    mainCharacters: ['Peppa', 'George', 'Mummy Pig', 'Daddy Pig', 'Suzy Sheep'],
    seasons: 8,
  },
  paw_patrol: {
    name: 'PAW Patrol',
    emoji: '🐾',
    color: '#1F75FE',
    accentColor: '#FFD500',
    platform: 'Paramount+',
    platformUrl: 'https://www.paramountplus.com/shows/paw-patrol/',
    description: 'Ryder and a team of rescue pups keep Adventure Bay safe',
    network: 'Nick Jr.',
    ageRange: '3-6',
    episodeLength: '22 min (two stories)',
    mainCharacters: ['Ryder', 'Chase', 'Marshall', 'Skye', 'Rubble', 'Rocky', 'Zuma', 'Everest'],
    seasons: 11,
  },
  cocomelon: {
    name: 'CoComelon',
    emoji: '🍉',
    color: '#58C3E6',
    accentColor: '#FF5C5C',
    platform: 'Netflix',
    platformUrl: 'https://www.netflix.com/title/81119395',
    description:
      'JJ and his family sing nursery rhymes and original songs about everyday toddler life',
    network: 'YouTube / Netflix',
    ageRange: '0-4',
    episodeLength: '3 min songs',
    mainCharacters: ['JJ', 'TomTom', 'YoYo', 'Mommy', 'Daddy', 'Bingo'],
    seasons: 3,
  },
  blues_clues: {
    name: "Blue's Clues & You!",
    emoji: '🐕‍🦺',
    color: '#0066CC',
    accentColor: '#FFB300',
    platform: 'Paramount+',
    platformUrl: 'https://www.paramountplus.com/shows/blues-clues-and-you/',
    description: 'Josh and Blue solve a puzzle in every episode by finding three paw-print clues',
    network: 'Nick Jr.',
    ageRange: '2-5',
    episodeLength: '22 min',
    mainCharacters: ['Josh', 'Blue', 'Magenta', 'Mailbox', 'Tickety Tock'],
    seasons: 4,
  },
  thomas_tank_engine: {
    name: 'Thomas & Friends',
    emoji: '🚂',
    color: '#1F4FA3',
    accentColor: '#E30613',
    platform: 'Netflix',
    description:
      'Thomas the Tank Engine and his engine friends keep the railway running on the Island of Sodor',
    network: 'Various',
    ageRange: '2-6',
    episodeLength: '10 min',
    mainCharacters: ['Thomas', 'Percy', 'James', 'Gordon', 'Emily', 'Sir Topham Hatt'],
    seasons: 24,
  },
  trash_truck: {
    name: 'Trash Truck',
    emoji: '🚛',
    color: '#6CC24A',
    accentColor: '#F4A300',
    platform: 'Netflix',
    platformUrl: 'https://www.netflix.com/title/81135004',
    description:
      'Six-year-old Hank and his best friend, a giant garbage truck, explore the world together',
    network: 'Netflix',
    ageRange: '2-5',
    episodeLength: '13 min',
    mainCharacters: ['Hank', 'Trash Truck', 'Walter', 'Donny', 'Ms. Mona'],
    seasons: 2,
  },
  bubble_guppies: {
    name: 'Bubble Guppies',
    emoji: '🐠',
    color: '#29B6F6',
    accentColor: '#FF7043',
    platform: 'Paramount+',
    description: 'Merperson preschoolers learn and sing their way through Bubbletucky',
    network: 'Nick Jr.',
    ageRange: '2-5',
    episodeLength: '22 min',
    mainCharacters: [
      'Molly',
      'Gil',
      'Goby',
      'Deema',
      'Oona',
      'Nonny',
      'Bubble Puppy',
      'Mr. Grouper',
    ],
    seasons: 6,
  },
  blippi: {
    name: 'Blippi',
    emoji: '🧢',
    color: '#FF8A00',
    accentColor: '#1E88E5',
    platform: 'YouTube',
    platformUrl: 'https://www.youtube.com/@Blippi',
    description: 'Blippi explores real places like fire stations, farms and play centres',
    network: 'YouTube',
    ageRange: '2-6',
    episodeLength: '10-60 min videos',
    mainCharacters: ['Blippi', 'Meekah'],
    isYouTube: true,
    seasons: 1,
  },
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : true];
  })
);

if (!args.show || args.help) {
  console.log(
    fs
      .readFileSync(fileURLToPath(import.meta.url), 'utf8')
      .split('*/')[0]
      .replace(/^\/\*\*?/, '')
  );
  console.log('Presets:', Object.keys(PRESETS).join(', '));
  process.exit(args.help ? 0 : 1);
}

const showId = String(args.show)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_');
const preset = PRESETS[showId] ?? {};
const show = {
  id: showId,
  name:
    args.name ?? preset.name ?? showId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  emoji: args.emoji ?? preset.emoji ?? '📺',
  description: args.description ?? preset.description ?? '',
  color: args.color ?? preset.color ?? '#2E9B9B',
  accentColor: preset.accentColor ?? '#E8846B',
  platform: args.platform ?? preset.platform ?? 'Unknown',
  platformUrl: args.platformUrl ?? preset.platformUrl ?? null,
  network: preset.network ?? null,
  isYouTube: Boolean(preset.isYouTube) || (args.platform ?? preset.platform) === 'YouTube',
  ageRange: preset.ageRange ?? null,
  episodeLength: preset.episodeLength ?? null,
  mainCharacters: preset.mainCharacters ?? [],
};

const dryRun = Boolean(args['dry-run']);
const batchSize = Number(args.batch ?? 15);
const model = args.model ?? 'claude-opus-5-5';

function parseSeasons(spec, fallback) {
  if (!spec) return Array.from({ length: fallback }, (_, i) => i + 1);
  const seasons = new Set();
  for (const part of String(spec).split(',')) {
    const [from, to] = part.split('-').map(Number);
    for (let s = from; s <= (to ?? from); s += 1) seasons.add(s);
  }
  return [...seasons].sort((a, b) => a - b);
}
const seasons = parseSeasons(args.seasons, preset.seasons ?? 1);

if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error('Set ANTHROPIC_API_KEY (in .env or the environment) first.');
  process.exit(1);
}

// User-level keys (sk-ant-usr-…) are not tied to a workspace and need its id on every request.
const client = new Anthropic(
  process.env.ANTHROPIC_WORKSPACE_ID
    ? { defaultHeaders: { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID } }
    : {}
);

// ---------------------------------------------------------------------------
// Structured output schemas
// ---------------------------------------------------------------------------
const EPISODE_LIST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['episodes'],
  properties: {
    episodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['season', 'episode', 'segment', 'title'],
        properties: {
          season: { type: 'integer' },
          episode: { type: 'integer' },
          segment: { type: 'string', description: '"A"/"B" for two-story episodes, else ""' },
          title: { type: 'string' },
        },
      },
    },
  },
};

const EPISODE_DETAILS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['episodes'],
  properties: {
    episodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'shortDescription',
          'fullSynopsis',
          'characters',
          'settings',
          'objects',
          'themes',
          'aliases',
        ],
        properties: {
          title: { type: 'string', description: 'Exactly as given in the request' },
          shortDescription: { type: 'string', description: 'One or two sentences' },
          fullSynopsis: { type: 'string', description: 'Three to five sentences' },
          characters: { type: 'array', items: { type: 'string' } },
          settings: { type: 'array', items: { type: 'string' } },
          objects: { type: 'array', items: { type: 'string' } },
          themes: { type: 'array', items: { type: 'string' } },
          aliases: {
            type: 'array',
            items: { type: 'string' },
            description: '15-20 parent/toddler phrasings',
          },
        },
      },
    },
  },
};

const SYSTEM = `You are building a catalog for Babbling Banks, an app that identifies toddler TV episodes from parents' chaotic descriptions. Be accurate: use real episode titles and plots. If you are not confident an episode exists, leave it out rather than inventing one.`;

async function ask(prompt, schema, maxTokens = 32000) {
  const stream = client.beta.messages.stream({
    model,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    output_config: { effort: 'high', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: prompt }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw new Error(
      `Claude declined this request (${message.stop_details?.category ?? 'unknown'}).`
    );
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('Response was cut off; try a smaller --batch.');
  }
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  return JSON.parse(text);
}

const makeId = (ep) =>
  `${showId}-s${ep.season}e${ep.episode}${ep.segment ? ep.segment.toLowerCase() : ''}`;

async function listEpisodes() {
  if (args.titles) {
    const seeded = JSON.parse(fs.readFileSync(path.resolve(String(args.titles)), 'utf8'));
    return seeded.map((ep) => ({ ...ep, segment: ep.segment ?? '' }));
  }
  const all = [];
  for (const season of seasons) {
    process.stdout.write(`Listing ${show.name} season ${season}… `);
    const { episodes } = await ask(
      `List every episode of "${show.name}" season ${season} in broadcast order. ` +
        `Use the show's real titles. If each episode contains two separate stories, list each story as its own entry with segment "A" or "B" and the same episode number; otherwise use segment "".`,
      EPISODE_LIST_SCHEMA,
      16000
    );
    console.log(`${episodes.length} episodes`);
    all.push(...episodes.filter((ep) => ep.season === season || (ep.season = season)));
  }
  return all;
}

async function describe(batch) {
  const list = batch
    .map(
      (ep) =>
        `- S${ep.season}E${ep.episode}${ep.segment || ''}: ${ep.title}` +
        (ep.summary ? `\n  Known plot (from an episode guide): ${ep.summary}` : '')
    )
    .join('\n');
  const { episodes } = await ask(
    `For each of these "${show.name}" episodes, write catalog details.\n\n${list}\n\n` +
      `Guidelines:\n` +
      `- shortDescription: 1-2 plain sentences a parent would recognise.\n` +
      `- fullSynopsis: 3-5 sentences of what actually happens.\n` +
      `- characters: who appears (main cast first), settings: where it happens, objects: notable things (a balloon, a kite), themes: 3-6 lessons or topics.\n` +
      `- aliases: 15-20 ways a tired parent or a toddler might describe this episode: "the one where…", key objects, nicknames, likely misspellings, what the toddler would shout. Lower-case, no punctuation.\n` +
      `- Where a known plot is given, base everything on it and do not add events it does not support.\n` +
      `Return the title exactly as given so entries can be matched.`,
    EPISODE_DETAILS_SCHEMA
  );
  return episodes;
}

async function main() {
  console.log(`\nGenerating catalog for ${show.name} (${showId}) with ${model}\n`);
  const filePath = path.join(episodesDir, `${showId}.json`);
  const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
  const existingIds = new Set(existing.map((ep) => ep.id));

  const listed = await listEpisodes();
  const todo = listed.filter((ep) => !existingIds.has(makeId(ep)));
  console.log(
    `\n${listed.length} episodes listed, ${todo.length} new, ${existing.length} already in catalog.\n`
  );

  const generated = [];
  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize);
    process.stdout.write(`Describing ${i + 1}-${i + batch.length} of ${todo.length}… `);
    const details = await describe(batch);
    const byTitle = new Map(details.map((d) => [d.title.trim().toLowerCase(), d]));
    let matched = 0;
    for (const ep of batch) {
      const detail = byTitle.get(ep.title.trim().toLowerCase());
      if (!detail) continue;
      matched += 1;
      const record = {
        id: makeId(ep),
        show: showId,
        season: ep.season,
        episode: ep.episode,
      };
      if (ep.segment) record.segment = ep.segment.toUpperCase();
      Object.assign(record, {
        title: ep.title,
        platform: show.platform,
        ...(show.platformUrl ? { platformUrl: show.platformUrl } : {}),
        ...(ep.videoId ? { videoId: ep.videoId } : {}),
        shortDescription: detail.shortDescription.trim(),
        fullSynopsis: detail.fullSynopsis.trim(),
        characters: dedupe(detail.characters),
        settings: dedupe(detail.settings),
        objects: dedupe(detail.objects),
        themes: dedupe(detail.themes),
        aliases: dedupe([...detail.aliases, ep.title.toLowerCase()]),
        source: args.source ?? 'AI Generated',
      });
      generated.push(record);
    }
    console.log(`${matched}/${batch.length} matched`);
  }

  const merged = [...existing, ...generated].sort(
    (a, b) =>
      a.season - b.season ||
      a.episode - b.episode ||
      String(a.segment ?? '').localeCompare(String(b.segment ?? ''))
  );

  if (dryRun) {
    console.log(JSON.stringify(generated, null, 2));
    console.log(
      `\nDry run: would write ${merged.length} episodes to ${path.relative(root, filePath)}`
    );
    return;
  }

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
  const shows = JSON.parse(fs.readFileSync(showsPath, 'utf8'));
  if (!shows[showId]) {
    shows[showId] = show;
    fs.writeFileSync(showsPath, JSON.stringify(shows, null, 2) + '\n');
    console.log(`Added ${show.name} to shows.json.`);
  }
  console.log(`\nWrote ${merged.length} episodes to ${path.relative(root, filePath)}.`);
  const indexPath = path.join(dataDir, 'index.js');
  if (!fs.readFileSync(indexPath, 'utf8').includes(`episodes/${showId}.json`)) {
    console.log(
      `\nNext: import './episodes/${showId}.json' in src/data/index.js and add it to EPISODES,`
    );
  }
  console.log('then run `npm run validate-catalog` and review the entries before committing.');
}

function dedupe(values) {
  const seen = new Set();
  const out = [];
  for (const value of values ?? []) {
    const clean = String(value).replace(/\s+/g, ' ').trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
  }
  return out;
}

main().catch((error) => {
  if (error instanceof Anthropic.AuthenticationError) console.error('Invalid ANTHROPIC_API_KEY.');
  else if (error instanceof Anthropic.RateLimitError)
    console.error('Rate limited; wait a minute and re-run (existing episodes are skipped).');
  else if (error instanceof Anthropic.APIError)
    console.error(`API error ${error.status}: ${error.message}`);
  else console.error(error.message ?? error);
  process.exit(1);
});
