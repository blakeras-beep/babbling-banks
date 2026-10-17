import { describe, it, expect } from 'vitest';
import {
  searchEpisodes,
  generateFollowUps,
  getRelatedEpisodes,
  getHighlightTerms,
} from './search.js';
import { tokenize, editDistance, fuzzyEquals, canonicalPhrase } from './text.js';
import { EPISODES, SHOWS } from '../data/index.js';

const titleOf = (results, index = 0) => results[index]?.episode.title;

describe('text helpers', () => {
  it('tokenizes with stopwords removed and toddler synonyms applied', () => {
    expect(tokenize('the one where the doggy freezes daddy')).toEqual(['dog', 'freeze', 'dad']);
  });

  it('canonicalises phrases', () => {
    expect(canonicalPhrase('Freeze Dad!')).toBe('freeze dad');
    expect(canonicalPhrase("Bluey's Birthday Party")).toBe('bluey birthday party');
  });

  it('computes edit distance with transpositions', () => {
    expect(editDistance('xylophone', 'xylohpone')).toBe(1);
    expect(editDistance('cat', 'dog')).toBe(3);
    expect(editDistance('abc', 'abcdefg', 2)).toBeGreaterThan(2);
  });

  it('tolerates typos proportional to word length', () => {
    expect(fuzzyEquals('cat', 'cot')).toBe(false);
    expect(fuzzyEquals('balloon', 'baloon')).toBe(true);
    expect(fuzzyEquals('xylophone', 'xylaphone')).toBe(true);
  });
});

describe('searchEpisodes', () => {
  it('returns nothing for empty queries', () => {
    expect(searchEpisodes('')).toEqual([]);
    expect(searchEpisodes('   ')).toEqual([]);
  });

  it('finds Magic Xylophone from the classic toddler description', () => {
    expect(titleOf(searchEpisodes('freeze dad'))).toBe('Magic Xylophone');
    expect(titleOf(searchEpisodes('the one where the dog freezes dad'))).toBe('Magic Xylophone');
  });

  it('survives misspellings', () => {
    expect(titleOf(searchEpisodes('magic xilaphone'))).toBe('Magic Xylophone');
    expect(titleOf(searchEpisodes('majic xylophon'))).toBe('Magic Xylophone');
  });

  it('matches exact titles first', () => {
    expect(titleOf(searchEpisodes('Keepy Uppy'))).toBe('Keepy Uppy');
    expect(titleOf(searchEpisodes('keepyuppy'))).toBe('Keepy Uppy');
  });

  it('finds songs inside YouTube videos', () => {
    const results = searchEpisodes('wheels on the bus', { limit: 3 });
    expect(results.length).toBe(3);
    // Curious George also has an episode with this title, so the song video
    // only needs to be near the top, matched through its song list.
    const video = results.find((r) => r.episode.show === 'miss_rachel');
    expect(video).toBeDefined();
    expect(video.matches.some((m) => m.field === 'song')).toBe(true);
  });

  it('does not treat substrings as word matches', () => {
    const results = searchEpisodes('sleepytime');
    expect(titleOf(results)).toBe('Sleepytime');
    // "bedtime" aliases contain "sleep" but should not match "sleepytime".
    expect(results.slice(1).every((r) => r.score < results[0].score / 2)).toBe(true);
  });

  it('respects the show filter', () => {
    const results = searchEpisodes('birthday', { show: 'daniel_tiger' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.episode.show === 'daniel_tiger')).toBe(true);
  });

  it('respects the character filter', () => {
    const results = searchEpisodes('cookie', { character: 'Cookie Monster' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.episode.characters.includes('Cookie Monster'))).toBe(true);
  });

  it('honours the limit', () => {
    expect(searchEpisodes('george', { limit: 3 })).toHaveLength(3);
  });

  it('reports what matched', () => {
    const [top] = searchEpisodes('freeze dad');
    expect(top.matches.length).toBeGreaterThan(0);
    expect(
      top.matches.every((m) => typeof m.field === 'string' && typeof m.text === 'string')
    ).toBe(true);
  });

  it('prefers results that cover the whole query', () => {
    const results = searchEpisodes('bandit magic xylophone');
    expect(titleOf(results)).toBe('Magic Xylophone');
    expect(results[0].coverage).toBe(1);
    // Results are sorted by score, then coverage.
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });
});

describe('catalog queries', () => {
  // One case per query checked or fixed in the catalog audit: "query" returns the id first.
  const cases = [
    ['the one where the dog freezes dad', 'bluey-s1e1'],
    ['the dog family has a bus', 'bluey-bus'],
    ['bluey burger shop', 'bluey-burger-shop'],
    ['bluey dad takes us on piggyback', 'bluey-piggyback'],
    ['bingo floppy chickenrat', 'bluey-s1e40'],
    ['monkey flies a kite', 'cg-s1e1a'],
    ['little fish littler pond', 'cg-s4e5b'],
    ['a monkeys duckling', 'cg-s5e1b'],
    ['the one where the pig jumps in muddy puddles', 'peppa_pig-s1e1'],
    ['george loses his dinosaur', 'peppa_pig-s1e2'],
    ['dine saw lost', 'peppa_pig-s1e2'],
    ['the pig with the glasses daddy', 'peppa_pig-s1e9'],
    ['peppa george has a cold', 'peppa_pig-s2e24'],
    ['puppies save the turtles', 'paw_patrol-s1e2a'],
    ['the one where everest joins', 'paw_patrol-s2e6'],
    ['the puppies and the ghost pirate', 'paw_patrol-s1e10'],
    ['daniel tiger potty song', 'daniel_tiger-s1e6'],
    ['daniel tiger trolley ride', 'daniel_tiger-s2e11a'],
    ['mickey goldfish goofy', 'mickey_mouse_funhouse-s1e2b'],
    ['elmo slide', 'sesame_street-s54e31'],
    ['goodbye mr hooper', 'sesame_street-s15e4'],
    ['snuffleupagus is real', 'sesame_street-s17e1'],
  ];
  it.each(cases)('"%s" returns %s first', (query, id) => {
    expect(searchEpisodes(query)[0]?.episode.id).toBe(id);
  });

  it('includes every show', () => {
    for (const showId of Object.keys(SHOWS)) {
      expect(EPISODES.some((e) => e.show === showId)).toBe(true);
    }
  });
});

describe('generateFollowUps', () => {
  it('returns nothing when the top result is a clear winner', () => {
    expect(generateFollowUps(searchEpisodes('magic xylophone'))).toEqual([]);
    expect(generateFollowUps(searchEpisodes('the one where the dog freezes dad'))).toEqual([]);
  });

  it('asks when several episodes score alike', () => {
    const questions = generateFollowUps(searchEpisodes('cookie monster'));
    expect(questions.length).toBeGreaterThan(0);
  });

  it('asks which show when results span shows', () => {
    const results = searchEpisodes('birthday party');
    const questions = generateFollowUps(results);
    const showQuestion = questions.find((q) => q.type === 'show');
    if (showQuestion) {
      expect(showQuestion.options.at(-1).label).toBe('Not sure');
      expect(showQuestion.options.length).toBeGreaterThan(2);
    }
    expect(questions.length).toBeLessThanOrEqual(2);
  });
});

describe('getHighlightTerms', () => {
  it('skips stopwords and keeps both spellings', () => {
    const terms = getHighlightTerms('the one where the doggy freezes dad');
    expect(terms).not.toContain('the');
    expect(terms).not.toContain('one');
    expect(terms).toEqual(expect.arrayContaining(['doggy', 'dog', 'freeze', 'dad']));
  });
});

describe('getRelatedEpisodes', () => {
  it('suggests other episodes from the same show first', () => {
    const magicXylophone = EPISODES.find((e) => e.id === 'bluey-s1e1');
    const related = getRelatedEpisodes(magicXylophone, 4);
    expect(related).toHaveLength(4);
    expect(related.every((e) => e.id !== magicXylophone.id)).toBe(true);
    expect(related[0].show).toBe('bluey');
  });
});

describe('catalog', () => {
  it('has unique episode ids that belong to known shows', () => {
    const ids = new Set();
    for (const episode of EPISODES) {
      expect(ids.has(episode.id)).toBe(false);
      ids.add(episode.id);
      expect(SHOWS[episode.show]).toBeDefined();
    }
  });
});
