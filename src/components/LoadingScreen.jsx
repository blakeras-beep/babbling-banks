import { useSearchParams } from 'react-router-dom';
import { useArtCredit } from '../lib/CreditContext.jsx';
import { pieceFor } from '../lib/art.js';
import QuoteStrip from './QuoteStrip.jsx';
import SpotStrip from './SpotStrip.jsx';

const PIECE = pieceFor('loading');

/** Loading: the kid's quote (if any) and the Green Leaf spot, "Thinking about it." */
export default function LoadingScreen() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  useArtCredit(PIECE?.id ?? null);
  return (
    <div className="col">
      {query && <QuoteStrip text={query} caption="You said" />}
      <SpotStrip pieceId={PIECE?.id} title="Thinking about it.">
        <p className="spot-strip__dots">decoding…</p>
      </SpotStrip>
    </div>
  );
}
