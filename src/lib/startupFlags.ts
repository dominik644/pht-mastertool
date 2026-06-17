/** Runtime flags for startup performance – URL params + env overrides. */

const SESSION_CACHE_KEY = 'pht_cache_warmed';

export function isLiteMode(): boolean {
  if (typeof window === 'undefined') return false;
  const qs = new URLSearchParams(window.location.search);
  return qs.get('lite') === '1' || import.meta.env.VITE_LITE_MODE === '1';
}

/** Supabase only – never fall back to live multi-provider search. */
export function isServerOnlyMode(): boolean {
  if (typeof window === 'undefined') return false;
  const qs = new URLSearchParams(window.location.search);
  return qs.get('server') === '1' || import.meta.env.VITE_SERVER_ONLY === '1';
}

/** Opt out of progressive startup (?legacy=1). */
export function isLegacyStartup(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('legacy') === '1';
}

/** Default: lite-like first paint, expand Supabase + live providers in background. */
export function isProgressiveStartup(): boolean {
  if (typeof window === 'undefined') return true;
  if (isLegacyStartup()) return false;
  return import.meta.env.VITE_PROGRESSIVE_STARTUP !== '0';
}

/** Skip localStorage tender cache reads on this session (default: first visit). */
export function isCacheDisabled(): boolean {
  if (typeof window === 'undefined') return true;
  if (import.meta.env.VITE_DISABLE_TENDER_CACHE === '1') return true;
  if (new URLSearchParams(window.location.search).get('nocache') === '1') return true;
  try {
    return sessionStorage.getItem(SESSION_CACHE_KEY) !== '1';
  } catch {
    return true;
  }
}

/** Skip localStorage on first paint – progressive default or explicit nocache. */
export function skipCacheOnStartup(): boolean {
  if (isCacheDisabled()) return true;
  if (isProgressiveStartup()) return true;
  return false;
}

export function markCacheSessionWarmed(): void {
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function initialVisibleTenderCount(): number {
  if (isLiteMode() || isProgressiveStartup()) return 20;
  return 30;
}

/** Live multi-provider search allowed (not ?server=1). */
export function allowsLiveProviders(): boolean {
  return !isServerOnlyMode();
}
