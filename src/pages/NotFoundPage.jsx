import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFoundPage({ message = "That page doesn't exist." }) {
  useDocumentTitle('Not found');
  return (
    <div className="container">
      <EmptyState emoji="🧭" title="Lost?" as="h1">
        <p>{message}</p>
        <p style={{ marginTop: 12 }}>
          <Link to="/" className="btn btn--primary">
            Back to search
          </Link>
        </p>
      </EmptyState>
    </div>
  );
}
