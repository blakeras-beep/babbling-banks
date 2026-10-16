import { useCallback, useEffect, useRef, useState } from 'react';

const getRecognition = () =>
  typeof window === 'undefined'
    ? null
    : window.SpeechRecognition || window.webkitSpeechRecognition || null;

/**
 * Wraps the Web Speech API. `supported` is false in browsers without it
 * (Firefox, some in-app browsers) so the UI can hide the microphone button.
 */
export function useSpeechRecognition({ onResult, lang = 'en-US' } = {}) {
  const Recognition = getRecognition();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!Recognition) return;
    setError(null);
    setInterim('');
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setInterim('');
        onResultRef.current?.(finalText.trim());
      }
    };
    recognition.onerror = (event) => {
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked.'
          : 'Could not hear that. Try again?'
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [Recognition, lang]);

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  return { supported: Boolean(Recognition), listening, interim, error, start, stop };
}
