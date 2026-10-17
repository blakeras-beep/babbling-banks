import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useArtCredit } from '../lib/CreditContext.jsx';
import ShowGrid from '../components/ShowGrid.jsx';
import { EPISODES, SHOW_LIST } from '../data/index.js';

/** All shows. Not in the kit; built from its parts. */
export default function ShowsPage() {
  useDocumentTitle('Shows');
  useArtCredit('several');
  return (
    <div className="col">
      <div className="tape tape--headline headline-strip headline-strip--plain">
        <h1 className="headline-strip__text">
          Every show
          <br />
          we know.
        </h1>
      </div>
      <p className="body-text">
        {EPISODES.length.toLocaleString()} episodes across {SHOW_LIST.length} shows, collected from
        public sources, so they may contain mistakes. Missing a show your toddler loves?{' '}
        <a
          href="https://github.com/blakeras-beep/babbling-banks/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ask for it
        </a>
        . The app is{' '}
        <a
          href="https://github.com/blakeras-beep/babbling-banks"
          target="_blank"
          rel="noopener noreferrer"
        >
          open source
        </a>
        .
      </p>
      <p className="notice notice--muted">
        Episode pictures come from{' '}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
          TMDB
        </a>
        . This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
      <ShowGrid title="all of them" />
    </div>
  );
}
