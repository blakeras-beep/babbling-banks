import { artUrl, getPiece } from '../lib/art.js';

/**
 * Spot art for in-between states: a cutout of a piece drawn on white paper,
 * 240 px tall, centered at the top of a straight tape strip, with the Dela 22
 * line and body below. Always on white tape, so no dark variant is needed.
 */
export default function SpotStrip({ pieceId, title, children, style }) {
  const piece = getPiece(pieceId);
  return (
    <section className="tape spot-strip" style={style} aria-live="polite">
      {piece && <img className="spot-strip__art" src={artUrl(piece, 'cutout')} alt="" />}
      <h1 className="spot-strip__title">{title}</h1>
      {children}
    </section>
  );
}
