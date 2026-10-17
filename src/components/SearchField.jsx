import { useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js';
import Icon from './Icon.jsx';

/**
 * The search field: a straight tape strip with the mic on the right and the
 * cobalt crayon line 6 px below. Long queries wrap; Enter submits.
 */
export default function SearchField({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  placeholder = 'the dog pool one',
  id = 'episode-search',
  label = 'Say what they said',
  inputRef: externalRef,
  formId,
}) {
  const localRef = useRef(null);
  const inputRef = externalRef ?? localRef;
  const speech = useSpeechRecognition({ onResult: onChange });

  useEffect(() => {
    if (autoFocus && !value) inputRef.current?.focus();
  }, [autoFocus, value, inputRef]);

  const note = speech.listening
    ? speech.interim
      ? `“${speech.interim}”`
      : 'Listening. Say what they said.'
    : speech.error;

  return (
    <form
      id={formId}
      className={`search-field ${speech.error ? 'search-field--error' : ''}`.trim()}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        inputRef.current?.blur();
        onSubmit?.(value);
      }}
    >
      <div className="tape search-field__strip">
        <label htmlFor={id} className="visually-hidden">
          {label}
        </label>
        <input
          id={id}
          ref={inputRef}
          className="search-field__input"
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
            className="search-field__button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            aria-label="Clear"
          >
            <Icon name="x" />
          </button>
        )}
        {speech.supported && (
          <button
            type="button"
            className={`search-field__button search-field__mic ${speech.listening ? 'is-listening' : ''}`.trim()}
            onClick={speech.listening ? speech.stop : speech.start}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? 'Stop listening' : 'Say it instead'}
          >
            <Icon name="microphone" />
          </button>
        )}
      </div>
      <span className="crayon-line crayon-line--underline" aria-hidden="true" />
      <p
        className={`search-field__note ${speech.error ? 'search-field__note--error' : ''}`.trim()}
        aria-live="polite"
      >
        {speech.error && !speech.listening && <Icon name="warningCircle" size={16} />}
        {note}
      </p>
    </form>
  );
}
