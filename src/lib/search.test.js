import { describe, it, expect } from 'vitest';
import {
  searchEpisodes,
  generateFollowUps,
  getRelatedEpisodes,
  getHighlightTerms,
} from './search.js';
import {
  tokenize,
  editDistance,
  fuzzyEquals,
  canonicalPhrase,
  canonicalToken,
  SYNONYMS,
} from './text.js';
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

  it('stems plurals and verb endings to the same token', () => {
    expect(tokenize('cakes smiled smiling')).toEqual(['cake', 'smile', 'smile']);
    // Stemmed forms still go through the synonym table: baked → bake (+ cook).
    expect(new Set(tokenize('baked baking'))).toEqual(new Set(tokenize('bake')));
    expect(tokenize('takes taking saved')).toEqual(['take', 'take', 'save']);
    expect(tokenize('movies onesies babies stories')).toEqual(['movie', 'onesie', 'baby', 'story']);
    expect(tokenize('surprised teasing weddings hopping')).toEqual([
      'surprise',
      'tease',
      'wed',
      'hop',
    ]);
    expect(tokenize('string spring need falling')).toEqual(['string', 'spring', 'need', 'fall']);
  });

  it('treats a job as work', () => {
    expect(tokenize("bandit's job")).toEqual(['bandit', 'work']);
    expect(tokenize('jobs day')).toEqual(['work', 'day']);
  });

  it('lets every spelling of a synonym meet its target', () => {
    expect(canonicalToken('sharing')).toBe(canonicalToken('share'));
    expect(canonicalToken('scary')).toBe(canonicalToken('scared'));
    expect(canonicalToken('swimming')).toBe(canonicalToken('swim'));
    expect(tokenize('trampolines')).toEqual(tokenize('trampoline'));
    for (const [word, target] of Object.entries(SYNONYMS)) {
      expect(new Set(tokenize(word)), `${word} → ${target}`).toEqual(new Set(tokenize(target)));
    }
  });

  it('drops accents so "chloe" finds Chloé', () => {
    expect(tokenize('Chloé Café Piñata')).toEqual(['chloe', 'cafe', 'pinata']);
  });

  it('ignores the filler a parent adds', () => {
    expect(tokenize('remember the one where they went camping')).toEqual(['camp']);
    expect(tokenize('its your birthday')).toEqual(['your', 'birthday']); // title words stay
  });

  it('keeps a specific word next to its broader synonym', () => {
    expect(tokenize('trampoline')).toEqual(['trampoline', 'bounce']);
    expect(tokenize('pool')).toContain('swim');
    expect(tokenize('fire truck')).toEqual(tokenize('firetruck'));
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

  it('finds Work from "bandits job"', () => {
    expect(titleOf(searchEpisodes('bandits job'))).toBe('Work');
    expect(titleOf(searchEpisodes("bluey dad's job"))).toBe('Work');
    expect(titleOf(searchEpisodes('working for dad'))).toBe('Work');
  });

  it('does not let a near miss of a known word pull in another show', () => {
    // "bluey" is a word the catalog knows, so it must not read as Blue's Clues' "blue".
    expect(searchEpisodes('bluey hotel')[0].episode.id).toBe('bluey-s1e10');
    expect(searchEpisodes('ice cream bluey')[0].episode.id).toBe('bluey-s2e45');
    expect(searchEpisodes('blue birthday')[0].episode.id).toBe('blues_clues-s1e11');
  });

  it('ranks results that cover the whole query above partial matches', () => {
    expect(titleOf(searchEpisodes('tooth fairy markets'))).toBe('Markets');
    expect(titleOf(searchEpisodes('unicorn bedtime story'))).toBe('Unicorse');
  });

  it('matches an exact title or alias said after the show name', () => {
    expect(searchEpisodes('bluey keepy uppy')[0].episode.id).toBe('bluey-s1e3');
    expect(searchEpisodes('bluey dads job')[0].episode.id).toBe('bluey-s1e31');
    expect(searchEpisodes('peppa george has a cold')[0].episode.id).toBe('peppa_pig-s2e24');
  });

  it('matches a title made only of stopwords', () => {
    expect(titleOf(searchEpisodes('the show'))).toBe('The Show');
    expect(titleOf(searchEpisodes('bluey the show'))).toBe('The Show');
    expect(titleOf(searchEpisodes('curious george what goes up'))).toBe('What Goes Up');
  });

  it('finds an episode from a season and episode reference', () => {
    expect(searchEpisodes('bluey s2e5')[0].episode.id).toBe('bluey-s2e5');
    expect(searchEpisodes('bluey season 2 episode 5')[0].episode.id).toBe('bluey-s2e5');
    expect(searchEpisodes('peppa 1x02')[0].episode.id).toBe('peppa_pig-s1e2');
    expect(searchEpisodes('curious george s1e6a')[0].episode.id).toBe('cg-s1e6a');
    expect(searchEpisodes('s1e31').some((r) => r.episode.id === 'bluey-s1e31')).toBe(true);
    // A title that only looks like a reference still matches.
    expect(titleOf(searchEpisodes('episode 847'))).toBe('Episode 847');
  });

  it('reads toddler pronunciations of words the catalog does not know', () => {
    expect(titleOf(searchEpisodes('wabbit'))).toMatch(/Bunny|Rabbit/);
    expect(searchEpisodes('tat')[0].matches.some((m) => /cat|kitt/i.test(m.text))).toBe(true);
    expect(searchEpisodes('bluey birfday')[0].episode.aliases.join(' ')).toMatch(/birthday/);
  });

  it('reads clipped words', () => {
    expect(searchEpisodes('puter')[0].matches.some((m) => /computer/i.test(m.text))).toBe(true);
  });

  it('recovers typos, including of spellings the catalog rewrites', () => {
    expect(titleOf(searchEpisodes('htoel'))).toBe('Hotel');
    expect(titleOf(searchEpisodes('garnnies'))).toBe('Grannies');
    expect(titleOf(searchEpisodes('blue muontains'))).toBe('Blue Mountains');
    expect(titleOf(searchEpisodes('bluey ice ceram'))).toBe('Ice Cream');
  });

  it('never fuzzy-matches numbers', () => {
    expect(searchEpisodes('sesame street 5411')[0].episode.id).toBe('sesame_street-s54e11');
    expect(searchEpisodes('sesame street episode 5511')[0].episode.id).toBe('sesame_street-s55e11');
  });

  it('matches an exact title ahead of a longer title with the same alias', () => {
    expect(titleOf(searchEpisodes('flying a kite'))).toBe('Flying a Kite');
  });

  it('keeps the specific word when a synonym broadens it', () => {
    expect(titleOf(searchEpisodes('trampoline'))).toBe('Trampoline');
    expect(
      searchEpisodes('bouncing', { limit: 3 }).some((r) => r.episode.title === 'Trampoline')
    ).toBe(true);
    expect(titleOf(searchEpisodes('bluey crick'))).toBe('The Creek');
  });

  it('weights rare words over common ones', () => {
    // "drainpipe" belongs to one episode; "bluey" and "bingo" to most of them.
    expect(titleOf(searchEpisodes('bluey bingo drainpipe'))).toBe('Work');
  });

  it('finds accented names from plain spellings', () => {
    expect(titleOf(searchEpisodes('chloes puppet show'))).toBe("Chloé's Puppet Show");
    expect(titleOf(searchEpisodes('bluey cafe'))).toBe('Café');
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
    // API review pass: corrected titles, synopses and characters.
    ['peppa secret club', 'peppa_pig-s1e13'],
    ['granny and grandpa babysit peppa', 'peppa_pig-s1e30'],
    ['peppa follows footprints back to the picnic', 'peppa_pig-s2e40'],
    ['bluey makes mum an omelette for mothers day', 'bluey-s3e5'],
    ['mum does the obstacle course', 'bluey-s3e3'],
    ['bluey builds a dam in the rain', 'bluey-s3e17'],
    ['bluey cousins play charades at nanas', 'bluey-s2e11'],
    ['tango obstacle course elmo', 'sesame_street-s53e11'],
    ['elmo tango dog', 'sesame_street-s53e11'],
    // Trash Truck
    ['garbage truck wants to fly', 'trash_truck-s1e1'],
    ['trash truck hiccups', 'trash_truck-s2e8'],
    ['the truck christmas', 'trash_truck-s0e1'],
    ['the truck gets stinky new shoes', 'trash_truck-s1e6'],
    ['bear hibernates', 'trash_truck-s1e7'],
    ['trash truck hibernation', 'trash_truck-s1e7'],
    // Blue's Clues & You!
    ['blue dog josh is sick', 'blues_clues-s4e5'],
    ['blue puppy birthday', 'blues_clues-s1e11'],
    ['steve comes back blues clues', 'blues_clues-s1e1'],
    ['blue clues ice cream', 'blues_clues-s4e21'],
    ['josh mexico city', 'blues_clues-s4e24'],
    // Search improvements: synonyms, stemming, known-word fuzzy discount, coverage.
    ['bandits job', 'bluey-s1e31'],
    ['bluey dads job', 'bluey-s1e31'],
    ['jobs day', 'sesame_street-s53e5'],
    ['george dinosaur lost', 'peppa_pig-s1e2'],
    ['bluey new house moving', 'bluey-s3e49'],
    ['duck cakes', 'bluey-s2e42'],
    ['pups saved the turtles', 'paw_patrol-s1e2a'],
    ['bluey onesie', 'bluey-s3e30'],
    ['bandit pretends to be a baby', 'bluey-s3e6'],
    ['bluey takes dads chair', 'bluey-s1e16'],
    ['bluey real estate agent', 'bluey-s3e48'],
    ['chilli obstacle course', 'bluey-s3e3'],
    ['grandad phones', 'bluey-s3e16'],
    ['bluey chess', 'bluey-s3e11'],
    ['bandit farts family meeting', 'bluey-s3e22'],
    // Full upgrade: references, typos, toddler sounds, rarity, show words.
    ['the one where the dog freezes dad', 'bluey-s1e1'],
    ['bluey dads job', 'bluey-s1e31'],
    ['sesame street episode 5511', 'sesame_street-s55e11'],
    ['bluey the show', 'bluey-s1e49'],
    ['bluey crick', 'bluey-s1e29'],
    ['the dcotor bluey', 'bluey-s1e18'],
    ['peppa george has a cold', 'peppa_pig-s2e24'],
    ['bluey s1e31', 'bluey-s1e31'],
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
