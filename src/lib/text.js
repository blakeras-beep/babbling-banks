/**
 * Text normalisation helpers shared by the search engine and the catalog
 * validator. Everything here is pure and has no browser dependencies.
 */

/** Words that carry no signal in a toddler's episode description. */
export const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'from',
  'by',
  'is',
  'it',
  'its',
  'was',
  'were',
  'be',
  'been',
  'are',
  'am',
  'this',
  'that',
  'these',
  'those',
  'he',
  'she',
  'they',
  'them',
  'his',
  'her',
  'their',
  'there',
  'then',
  'than',
  'when',
  'where',
  'who',
  'what',
  'which',
  'how',
  'one',
  'ones',
  'about',
  'into',
  'out',
  'up',
  'down',
  'all',
  'some',
  'very',
  'really',
  'just',
  'like',
  'so',
  'as',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'get',
  'gets',
  'got',
  'go',
  'goes',
  'went',
  'episode',
  'episodes',
  'show',
  'video',
  'where',
  'um',
  'uh',
  'thing',
  'things',
  'stuff',
  // Filler a parent adds while describing an episode ("i think its the one
  // where..."), but only words that never carry a title: "you", "my" and
  // "please" stay, because "It's YOUR Birthday!" needs them.
  'mine',
  'us',
  'ours',
  'yours',
  'him',
  'hers',
  'ive',
  'youre',
  'theyre',
  'weve',
  'didnt',
  'cannot',
  'wont',
  'couldnt',
  'wouldnt',
  'shouldnt',
  'isnt',
  'arent',
  'wasnt',
  'werent',
  'hasnt',
  'havent',
  'yes',
  'yeah',
  'yep',
  'nah',
  'ok',
  'okay',
  'oh',
  'ah',
  'hmm',
  'mm',
  'er',
  'could',
  'would',
  'should',
  'will',
  'think',
  'thinks',
  'remember',
  'sort',
  'bit',
  'anything',
  'anyone',
  'everyone',
  'lots',
  'lot',
  'much',
  'also',
  'others',
  'every',
  'any',
  'both',
  'either',
  'called',
  'named',
  'whats',
  'whos',
  'hows',
  'lets',
  'because',
  'cause',
  'cos',
  'why',
  'whose',
  'whom',
  'whatever',
  'whenever',
  'while',
  'during',
  'through',
  'always',
  'never',
  'ever',
  'still',
  'even',
  'most',
  'only',
  'own',
  'sure',
  'whole',
  'try',
  'trying',
  'tried',
  'said',
  'told',
  'ask',
  'asked',
  'put',
  'took',
  'came',
  'kept',
  'wanted',
  'being',
  'having',
]);

/**
 * Toddler-speak and casual synonyms, mapped to a canonical token.
 * Both the query and the catalog text are canonicalised with this table so
 * "doggy", "doggo" and "dog" all meet in the middle.
 *
 * A word that means the same thing maps to one token (`daddy → dad`). A word
 * that is only a kind of something broader keeps itself and adds the broad
 * word (`trampoline → trampoline bounce`), so "trampoline" still finds the
 * trampoline episode first while "bouncing" finds it too.
 */
export const SYNONYMS = {
  doggy: 'dog',
  doggie: 'dog',
  puppy: 'puppy dog',
  pup: 'pup dog',
  dogs: 'dog',
  kitty: 'cat',
  kitten: 'kitten cat',
  cats: 'cat',
  kitties: 'cat',
  daddy: 'dad',
  dada: 'dad',
  papa: 'dad',
  father: 'dad',
  daddys: 'dad',
  mommy: 'mum',
  mummy: 'mum',
  mama: 'mum',
  mom: 'mum',
  mother: 'mum',
  mommys: 'mum',
  mums: 'mum',
  grandma: 'nana',
  granny: 'nana',
  grandmother: 'nana',
  gran: 'nana',
  grandpa: 'grandad',
  grandfather: 'grandad',
  granddad: 'grandad',
  bday: 'birthday',
  bithday: 'birthday',
  choo: 'train',
  choochoo: 'train',
  trains: 'train',
  vroom: 'car',
  cars: 'car',
  automobile: 'car',
  potty: 'potty toilet',
  wee: 'wee toilet',
  pee: 'pee toilet',
  poop: 'poo',
  poopy: 'poo',
  nap: 'nap sleep',
  sleepy: 'sleep',
  sleeping: 'sleep',
  bedtime: 'bedtime sleep',
  asleep: 'sleep',
  naptime: 'nap sleep',
  bath: 'bath',
  bathtime: 'bath',
  tub: 'bath',
  scary: 'scare',
  scared: 'scare',
  afraid: 'scare',
  frightened: 'scare',
  spooky: 'scare',
  sad: 'sad',
  crying: 'cry',
  cried: 'cry',
  cries: 'cry',
  tears: 'cry',
  frozen: 'freeze',
  freezes: 'freeze',
  freezing: 'freeze',
  froze: 'freeze',
  tv: 'television',
  telly: 'television',
  phone: 'phone',
  telephone: 'phone',
  mobile: 'phone',
  bubbles: 'bubble',
  balloons: 'balloon',
  monkey: 'monkey',
  monkeys: 'monkey',
  george: 'george',
  elmos: 'elmo',
  xilophone: 'xylophone',
  xilaphone: 'xylophone',
  zylophone: 'xylophone',
  zilophone: 'xylophone',
  dinos: 'dinosaur',
  dino: 'dinosaur',
  dinosaurs: 'dinosaur',
  bunny: 'rabbit',
  bunnies: 'rabbit',
  rabbits: 'rabbit',
  ducky: 'duck',
  ducks: 'duck',
  duckling: 'duckling duck',
  horsey: 'horse',
  horsie: 'horse',
  pony: 'pony horse',
  horses: 'horse',
  fishy: 'fish',
  fishes: 'fish',
  birdie: 'bird',
  birds: 'bird',
  piggy: 'pig',
  piggie: 'pig',
  pigs: 'pig',
  cow: 'cow',
  moo: 'cow',
  cows: 'cow',
  bee: 'bee',
  bees: 'bee',
  buzzy: 'bee',
  ladybird: 'ladybug',
  poorly: 'sick',
  unwell: 'sick',
  doctor: 'doctor',
  doctors: 'doctor',
  hospital: 'hospital doctor',
  dentist: 'dentist',
  teeth: 'tooth',
  toothy: 'tooth',
  yummy: 'food',
  snack: 'snack food',
  dinner: 'dinner food',
  lunch: 'lunch food',
  breakfast: 'breakfast food',
  icecream: 'ice cream',
  playground: 'playground park',
  swing: 'swing park',
  swimming: 'swim',
  pool: 'pool swim',
  beach: 'beach',
  sand: 'sand beach',
  sandcastle: 'sandcastle sand beach',
  rainy: 'rain',
  raining: 'rain',
  rains: 'rain',
  snowy: 'snow',
  snowing: 'snow',
  snowman: 'snowman snow',
  sunny: 'sun',
  sunshine: 'sun',
  moon: 'moon',
  stars: 'star',
  starry: 'star',
  dance: 'dance',
  dancing: 'dance',
  dances: 'dance',
  danced: 'dance',
  sing: 'song',
  sings: 'song',
  singing: 'song',
  songs: 'song',
  sang: 'song',
  music: 'music',
  musical: 'music',
  magical: 'magic',
  wizard: 'wizard magic',
  wand: 'wand magic',
  superhero: 'superhero hero',
  heroes: 'hero',
  princesses: 'princess',
  pirates: 'pirate',
  treasure: 'treasure pirate',
  robots: 'robot',
  roboty: 'robot',
  rocket: 'rocket space',
  astronaut: 'astronaut space',
  planet: 'planet space',
  camping: 'camp',
  campsite: 'camp',
  tent: 'tent camp',
  shopping: 'shop',
  store: 'store shop',
  supermarket: 'supermarket shop',
  grocery: 'grocery shop',
  preschool: 'preschool school',
  kindergarten: 'kindergarten school',
  kindy: 'kindy school',
  teacher: 'teacher',
  teachers: 'teacher',
  babysitter: 'babysitter',
  sitter: 'babysitter',
  babies: 'baby',
  bub: 'baby',
  bubba: 'baby',
  newborn: 'baby',
  kids: 'kid',
  children: 'kid',
  child: 'kid',
  friends: 'friend',
  buddy: 'friend',
  mate: 'friend',
  mates: 'friend',
  pal: 'friend',
  sisters: 'sister',
  sis: 'sister',
  brothers: 'brother',
  bro: 'brother',
  cousins: 'cousin',
  neighbours: 'neighbor',
  neighbour: 'neighbor',
  neighbor: 'neighbor',
  neighbours: 'neighbor',
  neighbors: 'neighbor',
  games: 'game',
  gaming: 'game',
  toys: 'toy',
  toybox: 'toy',
  present: 'present',
  presents: 'present',
  gift: 'present',
  gifts: 'present',
  cake: 'cake',
  cupcake: 'cupcake cake',
  cookies: 'cookie',
  biscuit: 'cookie',
  biscuits: 'cookie',
  veggies: 'vegetable',
  vegetables: 'vegetable',
  veg: 'vegetable',
  fruits: 'fruit',
  bus: 'bus',
  buses: 'bus',
  bike: 'bike',
  bicycle: 'bike',
  bikes: 'bike',
  scooter: 'scooter bike',
  plane: 'airplane',
  aeroplane: 'airplane',
  planes: 'airplane',
  boat: 'boat',
  boats: 'boat',
  ship: 'boat',
  fire: 'fire',
  firefighter: 'firefighter fire',
  fireman: 'fireman fire',
  firetruck: 'fire truck',
  police: 'police',
  policeman: 'police',
  cop: 'police',
  garbage: 'trash',
  rubbish: 'trash',
  cleaning: 'clean',
  cleans: 'clean',
  tidy: 'clean',
  tidying: 'clean',
  mess: 'messy',
  colours: 'color',
  colour: 'color',
  colors: 'color',
  numbers: 'number',
  counting: 'count',
  counts: 'count',
  letters: 'letter',
  abcs: 'alphabet',
  abc: 'alphabet',
  shapes: 'shape',
  turns: 'turn',
  angry: 'mad',
  grumpy: 'mad',
  cranky: 'mad',
  frustrated: 'mad',
  happy: 'happy',
  glad: 'happy',
  excited: 'happy',
  brave: 'brave',
  bravery: 'brave',
  courage: 'brave',
  worried: 'worry',
  worries: 'worry',
  nervous: 'worry',
  anxious: 'worry',
  helps: 'help',
  helping: 'help',
  helped: 'help',
  helper: 'help',
  lost: 'lost',
  missing: 'lost',
  found: 'find',
  finds: 'find',
  finding: 'find',
  hide: 'hide',
  hiding: 'hide',
  hides: 'hide',
  hid: 'hide',
  seek: 'hide',
  chase: 'chase',
  chasing: 'chase',
  chased: 'chase',
  chases: 'chase',
  race: 'race',
  racing: 'race',
  races: 'race',
  flying: 'fly',
  flies: 'fly',
  flew: 'fly',
  kite: 'kite',
  kites: 'kite',
  bouncing: 'bounce',
  bounces: 'bounce',
  bouncy: 'bounce',
  trampoline: 'trampoline bounce',
  jumping: 'jump',
  jumps: 'jump',
  jumped: 'jump',
  running: 'run',
  runs: 'run',
  ran: 'run',
  walking: 'walk',
  walks: 'walk',
  walked: 'walk',
  cooking: 'cook',
  cooks: 'cook',
  cooked: 'cook',
  bake: 'bake cook',
  painting: 'paint',
  paints: 'paint',
  painted: 'paint',
  drawing: 'draw',
  draws: 'draw',
  drew: 'draw',
  building: 'build',
  builds: 'build',
  built: 'build',
  pretend: 'pretend',
  pretending: 'pretend',
  pretends: 'pretend',
  imaginary: 'pretend',
  dressup: 'costume',
  costumes: 'costume',
  dressing: 'costume',
  tickle: 'tickle',
  tickles: 'tickle',
  tickling: 'tickle',
  balls: 'ball',
  football: 'football ball',
  soccer: 'soccer ball',
  basketball: 'basketball ball',
  blocks: 'block',
  lego: 'lego block',
  dolls: 'doll',
  dolly: 'doll',
  teddy: 'teddy bear',
  bears: 'bear',
  frogs: 'frog',
  froggy: 'frog',
  turtles: 'turtle',
  tortoise: 'turtle',
  sharks: 'shark',
  wheels: 'wheel',
  job: 'work',
  jobs: 'work',
  worker: 'work',
  bossy: 'boss',
  dunny: 'dunny toilet',
  loo: 'toilet',
  cuddle: 'hug',
  injured: 'hurt',
  injury: 'hurt',
  owie: 'hurt',
  ouch: 'hurt',
  booboo: 'hurt',
  married: 'wedding',
  marry: 'wedding',
  marriage: 'wedding',
  aunty: 'aunt',
  auntie: 'aunt',
  nanna: 'nana',
  grampa: 'grandad',
  gramps: 'grandad',
  dadda: 'dad',
  mumma: 'mum',
  momma: 'mum',
  doggo: 'dog',
  woof: 'dog',
  meow: 'cat',
  miaow: 'cat',
  quack: 'duck',
  oink: 'pig',
  baa: 'sheep',
  lamb: 'sheep',
  bikkie: 'cookie',
  bikky: 'cookie',
  sweets: 'candy',
  lolly: 'candy',
  tummy: 'tummy',
  belly: 'tummy',
  stomach: 'tummy',
  muddy: 'mud',
  lorry: 'truck',
  chopper: 'helicopter',
  xmas: 'christmas',
  cinema: 'cinema movie',
  film: 'movie',
  haircut: 'haircut hairdresser',
  barber: 'barber hairdresser',
  pyjamas: 'pajama',
  pyjama: 'pajama',
  pjs: 'pajama',
  jammies: 'pajama',
  ipad: 'tablet',
  vacation: 'holiday',
  takeout: 'takeaway',
  footy: 'ball',
  favourite: 'favorite',
  wawa: 'water',
};

const PUNCTUATION = /[^a-z0-9\s]/g;
const WHITESPACE = /\s+/g;

/** Lower-case, drop accents ("Chloé" → "chloe"), strip punctuation, collapse whitespace. */
export function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(PUNCTUATION, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

/** Words that end in "-ie", whose plural must not become "-y": "movies" → "movie". */
const IE_WORDS = new Set([
  'movie',
  'cookie',
  'onesie',
  'zombie',
  'selfie',
  'hoodie',
  'smoothie',
  'birdie',
  'doggie',
  'auntie',
  'genie',
  'brownie',
  'pixie',
  'veggie',
  'cutie',
  'sweetie',
  'kiddie',
  'nightie',
  'undie',
  'bikkie',
  'horsie',
  'budgie',
  'magpie',
  'goalie',
  'bootie',
  'footie',
  'walkie',
  'talkie',
  'boogie',
  'lassie',
  'beanie',
  'blankie',
  'stuffie',
]);

/** Porter-style letter classes: "y" counts as a vowel after a consonant ("bluey"). */
function isVowel(word, i) {
  const letter = word[i];
  if ('aeiou'.includes(letter)) return true;
  return letter === 'y' && i > 0 && !isVowel(word, i - 1);
}

/** Porter's measure: how many vowel-consonant sequences the word has. */
function measure(word) {
  let m = 0;
  let previousVowel = false;
  for (let i = 0; i < word.length; i += 1) {
    const vowel = isVowel(word, i);
    if (!vowel && previousVowel) m += 1;
    previousVowel = vowel;
  }
  return m;
}

/** Ends consonant-vowel-consonant, the last not w, x or y: "bak", "driv" (short stems that need an e). */
function endsCvc(word) {
  const n = word.length;
  if (n < 3) return false;
  return (
    !isVowel(word, n - 3) &&
    isVowel(word, n - 2) &&
    !isVowel(word, n - 1) &&
    !'wxy'.includes(word[n - 1])
  );
}

/** "babies" → "baby", "movies" → "movie", "boxes" → "box", "cakes" → "cake". */
function stripPlural(word) {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) {
    return IE_WORDS.has(word.slice(0, -1)) ? word.slice(0, -1) : word.slice(0, -3) + 'y';
  }
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (/(?:ch|sh|x|z)es$/.test(word) && word.length > 4) return word.slice(0, -2);
  // "-us" and "-ous" are not plurals: "octopus", "circus", "curious".
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
  return word;
}

/**
 * Put back what stripping "-ed" / "-ing" took away: "hopp" → "hop" (while
 * "fall", "kiss" and "buzz" keep their double letter) and "bak" → "bake".
 */
function restoreStem(base) {
  const last = base[base.length - 1];
  if (base.length > 2 && last === base[base.length - 2] && !'aeioulsz'.includes(last)) {
    return base.slice(0, -1);
  }
  if (measure(base) === 1 && endsCvc(base)) return base + 'e';
  // English words do not end in "v" or a soft "c", and a vowel + s/z usually
  // had an e too: "leav" → "leave", "danc" → "dance", "teas" → "tease".
  if (/(?:[vc]|[aeiou][sz])$/.test(base)) return base + 'e';
  return base;
}

/** "jumping" → "jump", "carried" → "carry", "baked" → "bake"; "string" and "need" stay. */
function stripVerbEnding(word) {
  if (word.endsWith('ing') && word.length > 5) {
    const base = word.slice(0, -3);
    return measure(base) > 0 ? restoreStem(base) : word;
  }
  if (word.endsWith('ied') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('ed') && !word.endsWith('eed') && word.length > 4) {
    const base = word.slice(0, -2);
    return measure(base) > 0 ? restoreStem(base) : word;
  }
  return word;
}

/**
 * Very light stemmer: plurals, then common verb endings, so that "cakes",
 * "baked" and "baking" all land on "bake" and "weddings" lands on "wed".
 */
export function stem(word) {
  if (word.length <= 3) return word;
  return stripVerbEnding(stripPlural(word));
}

/**
 * Map a single normalised token to its canonical form. The table is checked
 * for the word as typed, its singular and its stem ("trampolines" finds
 * "trampoline"), and the target is stemmed as well, so every spelling of a
 * word meets at the same token whatever form the table happens to use.
 */
export function canonicalToken(word) {
  const stemmed = stem(word);
  const target = SYNONYMS[word] ?? SYNONYMS[stripPlural(word)] ?? SYNONYMS[stemmed];
  if (!target) return stemmed;
  return target.includes(' ') ? target.split(' ').map(stem).join(' ') : stem(target);
}

/**
 * Normalise a phrase, drop stopwords and canonicalise every token.
 * Returns an array of tokens (may be empty).
 */
export function tokenize(text, { keepStopwords = false } = {}) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const tokens = [];
  for (const raw of normalized.split(' ')) {
    if (!raw) continue;
    if (!keepStopwords && STOPWORDS.has(raw)) continue;
    const canonical = canonicalToken(raw);
    // Some synonyms expand to two words (e.g. "ice cream").
    for (const part of canonical.split(' ')) {
      if (part && (keepStopwords || !STOPWORDS.has(part))) tokens.push(part);
    }
  }
  return tokens;
}

/** Canonicalised phrase as a single string, e.g. "freeze dad". */
export function canonicalPhrase(text) {
  return tokenize(text).join(' ');
}

/**
 * Damerau-Levenshtein edit distance (optimal string alignment) with an early
 * exit once the distance is guaranteed to exceed `max`.
 */
export function editDistance(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev2 = null;
  let prev = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i += 1) {
    const current = new Array(cols);
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, current[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prev2[j - 2] + 1);
      }
      current[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = current;
  }
  return prev[cols - 1];
}

/** How many typos we tolerate for a token of the given length. */
export function fuzzyTolerance(length) {
  if (length < 4) return 0;
  if (length < 7) return 1;
  return 2;
}

/** True when two canonical tokens are equal or within typo tolerance. */
export function fuzzyEquals(a, b) {
  if (a === b) return true;
  const tolerance = Math.min(fuzzyTolerance(a.length), fuzzyTolerance(b.length));
  if (tolerance === 0) return false;
  return editDistance(a, b, tolerance) <= tolerance;
}
