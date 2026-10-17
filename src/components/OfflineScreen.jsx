import { useArtCredit } from '../lib/CreditContext.jsx';
import { pieceFor } from '../lib/art.js';
import SpotStrip from './SpotStrip.jsx';

const PIECE = pieceFor('offline');

/** Offline: the Cone Flat spot. Repeat offenders are on the device, so they still work. */
export default function OfflineScreen({ onRetry }) {
  useArtCredit(PIECE?.id ?? null);
  return (
    <div className="col">
      <SpotStrip pieceId={PIECE?.id} title="No internet." style={{ marginTop: 56 }}>
        <p className="spot-strip__body">
          We need it to look things up. Your repeat offenders still work.
        </p>
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      </SpotStrip>
    </div>
  );
}
