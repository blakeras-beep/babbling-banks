import { describe, expect, it } from 'vitest';
import {
  matchEpisode,
  matchSeason,
  similarity,
  splitTitles,
  usesDoubledNumbering,
} from './match-episodes.mjs';

const tmdb = (number, name, still = `/still-${number}.jpg`) => ({
  episode_number: number,
  name,
  still_path: still,
});

describe('splitTitles', () => {
  it('splits two-story names and normalizes punctuation', () => {
    expect(splitTitles('Curious George Flies a Kite / From Scratch')).toEqual([
      'curious george flies a kite',
      'from scratch',
    ]);
    expect(splitTitles("Blue's Clues & You!")).toEqual(['blues clues and you']);
  });
  it('drops accents and Sesame Street production numbers', () => {
    expect(splitTitles('Café')).toEqual(['cafe']);
    expect(splitTitles('Granny Bird Visits (0030)')).toEqual(['granny bird visits']);
  });
});

describe('similarity', () => {
  it('scores spelling variants high and different titles low', () => {
    expect(similarity('zeros to donuts', 'zeroes to donuts')).toBeGreaterThan(0.8);
    expect(similarity('pups save a hoedown', 'pups save a school day')).toBeLessThan(0.6);
  });
});

describe('usesDoubledNumbering', () => {
  const ours = [
    { episode: 1, segment: 'A' },
    { episode: 1, segment: 'B' },
    { episode: 2, segment: 'A' },
    { episode: 2, segment: 'B' },
  ];
  it('is true when TMDB lists about twice as many episodes', () => {
    expect(
      usesDoubledNumbering(
        [1, 2, 3, 4].map((n) => tmdb(n, `e${n}`)),
        ours
      )
    ).toBe(true);
  });
  it('is false when TMDB numbers the pair as one episode', () => {
    expect(
      usesDoubledNumbering(
        [1, 2].map((n) => tmdb(n, `e${n}`)),
        ours
      )
    ).toBe(false);
  });
  it('is false for shows without segments', () => {
    const plain = [{ episode: 1 }, { episode: 2 }];
    expect(
      usesDoubledNumbering(
        [1, 2, 3, 4].map((n) => tmdb(n, `e${n}`)),
        plain
      )
    ).toBe(false);
  });
});

describe('matchEpisode', () => {
  const season = [tmdb(1, 'Magic Xylophone'), tmdb(2, 'Hospital'), tmdb(3, 'Keepy Uppy (Part 1)')];
  it('matches by title first', () => {
    const match = matchEpisode({ title: 'Hospital', episode: 7 }, season);
    expect(match).toMatchObject({ how: 'title', episode: { episode_number: 2 } });
  });
  it('matches a title inside a longer TMDB name', () => {
    const match = matchEpisode({ title: 'Keepy Uppy', episode: 9 }, season);
    expect(match).toMatchObject({ how: 'title', episode: { episode_number: 3 } });
  });
  it('falls back to the episode number', () => {
    const match = matchEpisode({ title: 'Something Else', episode: 2 }, season);
    expect(match).toMatchObject({ how: 'number', episode: { episode_number: 2 } });
  });
  it('doubles the number for segments when asked', () => {
    const doubled = [1, 2, 3, 4].map((n) => tmdb(n, `story ${n}`));
    expect(
      matchEpisode({ title: 'x', episode: 2, segment: 'A' }, doubled, { doubled: true }).episode
        .episode_number
    ).toBe(3);
    expect(
      matchEpisode({ title: 'x', episode: 2, segment: 'B' }, doubled, { doubled: true }).episode
        .episode_number
    ).toBe(4);
  });
  it('matches accents and spacing differences exactly', () => {
    const bluey = [tmdb(24, 'Wagonride'), tmdb(35, 'Cafe'), tmdb(12, 'Sheep Dog')];
    expect(matchEpisode({ title: 'Wagon Ride', episode: 1 }, bluey).episode.episode_number).toBe(
      24
    );
    expect(matchEpisode({ title: 'Café', episode: 1 }, bluey).episode.episode_number).toBe(35);
    expect(matchEpisode({ title: 'Sheepdog', episode: 1 }, bluey).episode.episode_number).toBe(12);
  });
  it('finds an episode TMDB files under another season or the specials', () => {
    // Bluey's "The Sign" is in TMDB's specials; PAW Patrol S2 stories sit in S3.
    const season3 = [tmdb(49, 'Surprise!')];
    const specials = [tmdb(27, 'The Sign', '/sign.jpg')];
    const match = matchEpisode({ title: 'The Sign', episode: 49 }, season3, {
      elsewhere: specials,
    });
    expect(match).toMatchObject({ how: 'elsewhere', episode: { still_path: '/sign.jpg' } });
  });
  it('matches near-identical titles: spelling variants and filler words', () => {
    const season = [tmdb(5, 'Zeroes to Donuts'), tmdb(59, 'Calm Before Story Time')];
    expect(matchEpisode({ title: 'Zeros to Donuts', episode: 3 }, season)).toMatchObject({
      how: 'fuzzy',
      episode: { episode_number: 5 },
    });
    expect(matchEpisode({ title: 'Calm for Storytime', episode: 30 }, season)).toMatchObject({
      how: 'fuzzy',
      episode: { episode_number: 59 },
    });
  });
  it('never fuzzes across different numbers', () => {
    // Sesame Street's untitled "Episode 2096" is not "Episode 2209".
    const season = [tmdb(1, 'Snuffy is real'), tmdb(9, 'Episode 2209')];
    expect(matchEpisode({ title: 'Episode 2096', episode: 1 }, season)).toMatchObject({
      how: 'number',
      episode: { episode_number: 1 },
    });
  });
  it('skips fuzzy targets another episode owns exactly', () => {
    const season = [tmdb(3, 'Pups Save the Parrot')];
    expect(
      matchEpisode({ title: 'Pups Save the Parade', episode: 9 }, season, {
        taken: new Set(['pupssavetheparrot']),
      })
    ).toBeNull();
  });
  it('returns null when nothing fits', () => {
    expect(matchEpisode({ title: 'Nope', episode: 99 }, season)).toBeNull();
  });
});

describe('matchSeason', () => {
  it('returns a still or null for every episode', () => {
    const ours = [
      { id: 'a', title: 'Magic Xylophone', episode: 1 },
      { id: 'b', title: 'Unknown', episode: 5 },
    ];
    const result = matchSeason(ours, [tmdb(1, 'Magic Xylophone'), tmdb(2, 'Hospital', null)]);
    expect(result).toEqual([
      { id: 'a', still: '/still-1.jpg', how: 'title' },
      { id: 'b', still: null, how: 'none' },
    ]);
  });
  it('refuses a number hit on a TMDB episode another of ours owns by title', () => {
    // Our "The Sign" (49) must not take TMDB #49 "Surprise!", which is our 50.
    const ours = [
      { id: 'sign', title: 'The Sign', episode: 49 },
      { id: 'surprise', title: 'Surprise!', episode: 50 },
    ];
    const result = matchSeason(ours, [tmdb(49, 'Surprise!')]);
    expect(result).toEqual([
      { id: 'sign', still: null, how: 'none' },
      { id: 'surprise', still: '/still-49.jpg', how: 'title' },
    ]);
  });
  it('lets the second story of a paired TMDB episode share its still', () => {
    const ours = [
      { id: 'a', title: 'Flies a Kite', episode: 1, segment: 'A' },
      { id: 'b', title: 'Untitled', episode: 1, segment: 'B' },
    ];
    const result = matchSeason(ours, [tmdb(1, 'Flies a Kite / From Scratch')]);
    expect(result.map((r) => r.still)).toEqual(['/still-1.jpg', '/still-1.jpg']);
  });
});
