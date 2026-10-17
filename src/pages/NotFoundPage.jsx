import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useArtCredit } from '../lib/CreditContext.jsx';
import { pieceFor } from '../lib/art.js';
import ArtBand from '../components/ArtBand.jsx';

const PIECE = pieceFor('404');

/** 404: the Black and Blue scribble hung whole, straight on paper, inverted at night. */
export default function NotFoundPage({
  message = 'This page wandered off. Happens to the best of us.',
}) {
  useDocumentTitle('Lost the thread');
  useArtCredit(PIECE?.id ?? null);
  return (
    <div className="home">
      <ArtBand pieceId={PIECE?.id} file="cutout" keepInDark className="art-band--scribble" />
      <div className="col">
        <div className="tape tape--headline headline-strip">
          <h1 className="headline-strip__text">
            Lost the
            <br />
            thread.
          </h1>
        </div>
        <p className="lead">{message}</p>
        <Link to="/" className="btn-primary home__button">
          Back to finding
        </Link>
      </div>
    </div>
  );
}
