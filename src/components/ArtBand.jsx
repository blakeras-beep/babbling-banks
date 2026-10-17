import { useTheme } from '../lib/ThemeContext.jsx';
import { artUrl, getPiece, NIGHT_PIECE_ID } from '../lib/art.js';

/**
 * One of Banks' pieces, full-bleed and decorative (alt=""; the credit names it).
 *
 * - A "field" piece crops with object-fit: cover at its focus point to `height`.
 * - An "object" piece is hung whole: full width, natural height, never cropped.
 * - Dark theme swaps every band for the night piece, cropped to the same height
 *   the light piece takes, so nothing shifts when the theme changes.
 *   `keepInDark` (the 404 scribble) keeps its own piece, inverted via CSS.
 */
export default function ArtBand({
  pieceId,
  height,
  file = 'web',
  keepInDark = false,
  className = '',
  style,
}) {
  const { resolvedTheme } = useTheme();
  const piece = getPiece(pieceId);
  if (!piece) return null;
  const dark = resolvedTheme === 'dark' && !keepInDark;
  const night = getPiece(NIGHT_PIECE_ID);
  const isField = piece.mode === 'field';

  if (isField) {
    const shown = dark ? night : piece;
    return (
      <div
        className={`art-band art-band--field ${className}`.trim()}
        style={{ height, ...style }}
        aria-hidden="true"
      >
        <img
          className="art-band__img"
          src={artUrl(shown)}
          alt=""
          style={{ objectPosition: shown.focus ?? '50% 50%' }}
          decoding="async"
        />
      </div>
    );
  }

  // Object piece: the light image sizes the band; at night it is hidden under
  // the night piece but keeps its height.
  return (
    <div
      className={`art-band art-band--object ${dark ? 'art-band--night' : ''} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <img className="art-band__img art-band__img--whole" src={artUrl(piece, file)} alt="" />
      {dark && (
        <img
          className="art-band__img art-band__img--night"
          src={artUrl(night)}
          alt=""
          style={{ objectPosition: night.focus ?? '50% 50%' }}
          decoding="async"
        />
      )}
    </div>
  );
}
