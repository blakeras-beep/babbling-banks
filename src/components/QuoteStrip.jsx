import { isMatchedWord } from '../lib/matchedWords.js';

/**
 * The kid's words on a tape strip (-2°), in real quotation marks, with a lemon
 * crayon swipe behind each matched word (max three, alternating the two swipe
 * images). The closing mark stays on the same line as the last word.
 */
export default function QuoteStrip({ text, matched = [], caption, className = '' }) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  let swipe = 0;
  return (
    <div className={`tape tape--quote quote-strip ${className}`.trim()}>
      <p className="quote-strip__text">
        {words.map((word, index) => {
          const first = index === 0;
          const last = index === words.length - 1;
          let node = word;
          if (matched.length > 0 && isMatchedWord(word, matched)) {
            const alt = swipe % 2 === 1;
            swipe += 1;
            node = <span className={`match ${alt ? 'match--alt' : ''}`.trim()}>{word}</span>;
          }
          if (first || last) {
            node = (
              <span className="nowrap">
                {first ? '“' : ''}
                {node}
                {last ? '”' : ''}
              </span>
            );
          }
          return (
            <span key={`${index}-${word}`}>
              {node}
              {last ? '' : ' '}
            </span>
          );
        })}
      </p>
      {caption && <span className="quote-strip__caption">{caption}</span>}
    </div>
  );
}
