import { describe, expect, it } from 'vitest';
import { matchEpisode, matchSeason, splitTitles, usesDoubledNumbering } from './match-episodes.mjs';

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
});
