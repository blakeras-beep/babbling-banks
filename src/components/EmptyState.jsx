export default function EmptyState({ emoji = '🤔', title, children, as: Heading = 'h2' }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__emoji" aria-hidden="true">
        {emoji}
      </div>
      <Heading className="empty-state__title">{title}</Heading>
      {children && <div>{children}</div>}
    </div>
  );
}
