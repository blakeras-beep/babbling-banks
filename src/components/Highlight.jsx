import { useMemo } from 'react';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Wraps words in `text` that start with any of `terms` in <mark>. The whole
 * word is highlighted ("Daddy" for the term "dad") so a word is never split
 * visually in two.
 */
export default function Highlight({ text, terms }) {
  const parts = useMemo(() => {
    if (!text || !terms || terms.length === 0) return [text];
    const pattern = new RegExp(`\\b((?:${terms.map(escapeRegExp).join('|')})\\w*)`, 'gi');
    return text.split(pattern);
  }, [text, terms]);

  if (parts.length === 1) return <>{text}</>;
  // String.split with one capture group alternates: plain, match, plain, match…
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
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
