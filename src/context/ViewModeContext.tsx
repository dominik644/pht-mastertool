import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { MOBILE_BREAKPOINT, useMediaQuery } from '../hooks/useMediaQuery';

export type ViewMode = 'desktop' | 'mobile';

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isMobileView: boolean;
  isNarrowScreen: boolean;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const isNarrowScreen = useMediaQuery(MOBILE_BREAKPOINT);
  const [userOverride, setUserOverride] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches ? 'mobile' : 'desktop',
  );

  useEffect(() => {
    if (!userOverride) {
      setViewModeState(isNarrowScreen ? 'mobile' : 'desktop');
    }
  }, [isNarrowScreen, userOverride]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setUserOverride(true);
    setViewModeState(mode);
  }, []);

  const isMobileView = viewMode === 'mobile';

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, isMobileView, isNarrowScreen }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider');
  return ctx;
}
