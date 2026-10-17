import { Link } from 'react-router-dom';

/**
 * Example searches: the kid's words in real quotes, label type in cobalt,
 * no container, 44 px tap height, stacked. Introduced by "try one".
 */
export default function ExampleSearches({ examples, onPick, label = 'try one' }) {
  return (
    <>
      <h2 className="section-label">{label}</h2>
      <ul className="examples">
        {examples.map((example) => (
          <li key={example}>
            {onPick ? (
              <button type="button" className="example-link" onClick={() => onPick(example)}>
                {'“'}
                {example}
                {'”'}
              </button>
            ) : (
              <Link className="example-link" to={`/?q=${encodeURIComponent(example)}`}>
                {'“'}
                {example}
                {'”'}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
