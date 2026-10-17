/**
 * Banks' art collection. Titles, media, modes and focus points come from the
 * kit's collection.json (copied to src/data/art-collection.json); nothing here
 * is hard-coded. The image files live in public/art/ under their kit names.
 */
import collection from '../data/art-collection.json';

export const ARTIST = collection.artist;
export const PIECES = collection.pieces;

const BY_ID = new Map(PIECES.map((piece) => [piece.id, piece]));

/** The piece that every art band uses in the dark theme. */
export const NIGHT_PIECE_ID =
  PIECES.find((piece) => piece.usedOn.includes('dark-theme-all-bands'))?.id ?? 'night-01';

export function getPiece(id) {
  return BY_ID.get(id) ?? null;
}

/** Public URL for one of a piece's files ("web" or "cutout"). */
export function artUrl(piece, kind = 'web') {
  const file = piece?.files?.[kind];
  if (!file) return null;
  return `/art/${file.split('/').pop()}`;
}

/** The piece used on a screen, from the manifest's usedOn list. */
export function pieceFor(screen) {
  return PIECES.find((piece) => piece.usedOn.includes(screen)) ?? null;
}

/** "Art by Banks · Mint and Blue", or plain "Art by Banks" for several pieces. */
export function creditText(piece) {
  if (!piece) return `Art by ${ARTIST}`;
  return collection.creditFormat.replace('{title}', piece.title);
}

/** Alt text for the art page: "Mint and Blue, by Banks". */
export function altText(piece) {
  return `${piece.title}, by ${ARTIST}`;
}
