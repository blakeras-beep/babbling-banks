import { useEffect } from 'react';

const BASE = 'Babbling Banks';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} - What Episode Is This?`;
    return () => {
      document.title = `${BASE} - What Episode Is This?`;
    };
  }, [title]);
}
