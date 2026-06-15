import { MOBILE_BREAKPOINT } from '../hooks/useMediaQuery';

/** True on narrow viewports (phones / small tablets). */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_BREAKPOINT).matches;
}
