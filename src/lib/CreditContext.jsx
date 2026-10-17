import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Which of Banks' pieces the current screen shows, so the layout can print
 * "Art by Banks · <title>" once, bottom-right. A page calls
 * `useArtCredit(pieceId)`; `useArtCredit('several')` prints the plain credit
 * and `useArtCredit(null)` hides it (the art page).
 */
const CreditContext = createContext({ credit: null, setCredit() {} });

export function CreditProvider({ children }) {
  const [credit, setCredit] = useState(null);
  const value = useMemo(() => ({ credit, setCredit }), [credit]);
  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
}

export function useArtCredit(pieceId) {
  const { setCredit } = useContext(CreditContext);
  useEffect(() => {
    setCredit(pieceId);
    return () => setCredit(null);
  }, [pieceId, setCredit]);
}

export function useCurrentCredit() {
  return useContext(CreditContext).credit;
}
