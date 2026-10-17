import { useEffect } from 'react';

const BASE = 'Babbling Banks';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE}. Find it from whatever they said.`;
    return () => {
      document.title = `${BASE}. Find it from whatever they said.`;
    };
  }, [title]);
}
