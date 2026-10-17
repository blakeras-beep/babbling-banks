import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useArtCredit } from '../lib/CreditContext.jsx';
import { altText, artUrl, PIECES } from '../lib/art.js';

/**
 * "Art by Banks": every piece in the collection shown whole, two columns,
 * straight, each with a wall label. No credit line; the whole page is one.
 */
export default function ArtPage() {
  useDocumentTitle('Art by Banks');
  useArtCredit(null);
  return (
    <div className="col">
      <div className="tape tape--headline headline-strip headline-strip--plain">
        <h1 className="headline-strip__text">
          Art by
          <br />
          Banks.
        </h1>
      </div>
      <p className="body-text">
        Every picture here was made by Banks, the toddler this app is named for. Crayon, finger
        paint, tape, stars. We just cleaned them up.
      </p>
      <div className="wall">
        {PIECES.map((piece) => (
          <figure className="wall__figure" key={piece.id}>
            <img src={artUrl(piece)} alt={altText(piece)} loading="lazy" decoding="async" />
            <figcaption className="wall__label">
              <span className="wall__title">{piece.title}</span>
              {piece.medium}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="body-text" style={{ marginTop: 32 }}>
        <Link to="/shows" className="example-link" style={{ display: 'inline-flex' }}>
          Every show we know
        </Link>
      </p>
    </div>
  );
}
