export default function EmptyState({ emoji = '🤔', title, children }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__emoji" aria-hidden="true">
        {emoji}
      </div>
      <div className="empty-state__title">{title}</div>
      {children && <div>{children}</div>}
    </div>
  );
}
