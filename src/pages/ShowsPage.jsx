import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import ShowGrid from '../components/ShowGrid.jsx';
import { EPISODES } from '../data/index.js';

export default function ShowsPage() {
  useDocumentTitle('Shows');
  return (
    <div className="container">
      <h1 className="page__title">Shows</h1>
      <p className="page__subtitle">
        {EPISODES.length.toLocaleString()} episodes catalogued so far. Missing a show your toddler
        loves?{' '}
        <a
          href="https://github.com/blakeras-beep/babbling-banks/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          Request it
        </a>
        .
      </p>
      <ShowGrid title="All shows" />
    </div>
  );
}
