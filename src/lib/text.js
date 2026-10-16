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
]);

/**
 * Toddler-speak and casual synonyms, mapped to a canonical token.
 * Both the query and the catalog text are canonicalised with this table so
 * "doggy", "puppy" and "dog" all meet in the middle.
 */
export const SYNONYMS = {
  doggy: 'dog',
  doggie: 'dog',
  puppy: 'dog',
  puppies: 'dog',
  pup: 'dog',
  dogs: 'dog',
  kitty: 'cat',
  kitten: 'cat',
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
  potty: 'toilet',
  wee: 'toilet',
  pee: 'toilet',
  poop: 'poo',
  poopy: 'poo',
  nap: 'sleep',
  sleepy: 'sleep',
  sleeping: 'sleep',
  bedtime: 'sleep',
  asleep: 'sleep',
  naptime: 'sleep',
  bath: 'bath',
  bathtime: 'bath',
  tub: 'bath',
  scary: 'scared',
  afraid: 'scared',
  frightened: 'scared',
  spooky: 'scared',
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
  duckling: 'duck',
  horsey: 'horse',
  horsie: 'horse',
  pony: 'horse',
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
  hospital: 'doctor',
  dentist: 'dentist',
  teeth: 'tooth',
  toothy: 'tooth',
  yummy: 'food',
  snack: 'food',
  snacks: 'food',
  dinner: 'food',
  lunch: 'food',
  breakfast: 'food',
  icecream: 'ice cream',
  playground: 'park',
  swings: 'park',
  swim: 'swimming',
  swims: 'swimming',
  pool: 'swimming',
  beach: 'beach',
  sand: 'beach',
  sandcastle: 'beach',
  rainy: 'rain',
  raining: 'rain',
  rains: 'rain',
  snowy: 'snow',
  snowing: 'snow',
  snowman: 'snow',
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
  wizard: 'magic',
  wand: 'magic',
  superhero: 'hero',
  superheroes: 'hero',
  heroes: 'hero',
  princesses: 'princess',
  pirates: 'pirate',
  treasure: 'pirate',
  robots: 'robot',
  roboty: 'robot',
  rocket: 'space',
  rockets: 'space',
  astronaut: 'space',
  planet: 'space',
  planets: 'space',
  camping: 'camp',
  campsite: 'camp',
  tent: 'camp',
  shopping: 'shop',
  store: 'shop',
  supermarket: 'shop',
  grocery: 'shop',
  groceries: 'shop',
  preschool: 'school',
  kindergarten: 'school',
  kindy: 'school',
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
  cupcake: 'cake',
  cupcakes: 'cake',
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
  scooter: 'bike',
  plane: 'airplane',
  aeroplane: 'airplane',
  planes: 'airplane',
  boat: 'boat',
  boats: 'boat',
  ship: 'boat',
  fire: 'fire',
  firefighter: 'fire',
  fireman: 'fire',
  firetruck: 'fire',
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
  share: 'sharing',
  shares: 'sharing',
  shared: 'sharing',
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
  trampoline: 'bounce',
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
  baking: 'cook',
  bake: 'cook',
  bakes: 'cook',
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
  football: 'ball',
  soccer: 'ball',
  basketball: 'ball',
  blocks: 'block',
  lego: 'block',
  dolls: 'doll',
  dolly: 'doll',
  teddy: 'bear',
  bears: 'bear',
  frogs: 'frog',
  froggy: 'frog',
  turtles: 'turtle',
  tortoise: 'turtle',
  sharks: 'shark',
  wheels: 'wheel',
};

const PUNCTUATION = /[^a-z0-9\s]/g;
const WHITESPACE = /\s+/g;

/** Lower-case, strip punctuation, collapse whitespace. */
export function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(PUNCTUATION, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

/** Very light stemmer: plurals and common verb endings. */
export function stem(word) {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

/** Map a single normalised token to its canonical form. */
export function canonicalToken(word) {
  const synonym = SYNONYMS[word];
  if (synonym) return synonym;
  const stemmed = stem(word);
  return SYNONYMS[stemmed] ?? stemmed;
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
