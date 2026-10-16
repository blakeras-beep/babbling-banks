import { useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js';

export default function SearchBox({
  value,
  onChange,
  autoFocus = false,
  placeholder = 'Describe the episode…',
}) {
  const inputRef = useRef(null);
  const speech = useSpeechRecognition({ onResult: onChange });

  useEffect(() => {
    if (autoFocus && !value) inputRef.current?.focus();
  }, [autoFocus, value]);

  return (
    <div>
      <div className="search-box" role="search">
        <span className="search-box__icon" aria-hidden="true">
          🔍
        </span>
        <label htmlFor="episode-search" className="visually-hidden">
          Describe the episode
        </label>
        <input
          id="episode-search"
          ref={inputRef}
          className="search-box__input"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
        />
        {value && (
          <button
            type="button"
            className="search-box__clear"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        {speech.supported && (
          <button
            type="button"
            className={`search-box__voice ${speech.listening ? 'is-listening' : ''}`}
            onClick={speech.listening ? speech.stop : speech.start}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? 'Stop listening' : 'Search by voice'}
          >
            <span aria-hidden="true">{speech.listening ? '🔴' : '🎤'}</span>
            <span className="label">{speech.listening ? 'Listening…' : 'Voice'}</span>
          </button>
        )}
      </div>
      <p className={`search-hint ${speech.error ? 'search-hint--error' : ''}`} aria-live="polite">
        {speech.listening &&
          (speech.interim ? `“${speech.interim}”` : 'Listening… say what your toddler said')}
        {!speech.listening && speech.error}
      </p>
    </div>
  );
}
