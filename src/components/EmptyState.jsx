import ExampleSearches from './ExampleSearches.jsx';

/**
 * A straight tape strip: a Dela 20 line, a body line, and (optionally)
 * example searches under "try one". The results screen's "That one stumped us."
 */
export default function EmptyState({ title, children, examples, onPick }) {
  return (
    <section className="tape empty-strip" role="status" aria-labelledby="empty-title">
      <h1 className="empty-strip__title" id="empty-title">
        {title}
      </h1>
      {children}
      {examples?.length > 0 && <ExampleSearches examples={examples} onPick={onPick} />}
    </section>
  );
}
