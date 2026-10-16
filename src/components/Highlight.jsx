import { useMemo } from 'react';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wraps any of `terms` found in `text` in <mark>. */
export default function Highlight({ text, terms }) {
  const parts = useMemo(() => {
    if (!text || !terms || terms.length === 0) return [text];
    const pattern = new RegExp(`\\b(${terms.map(escapeRegExp).join('|')})`, 'gi');
    return text.split(pattern);
  }, [text, terms]);

  if (parts.length === 1) return <>{text}</>;
  const lower = new Set(terms.map((t) => t.toLowerCase()));
  return (
    <>
      {parts.map((part, index) =>
        lower.has(part.toLowerCase()) ? (
          <mark className="highlight" key={index}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}
