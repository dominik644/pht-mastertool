/** Runtime flags for startup performance – URL params + env overrides. */

const SESSION_CACHE_KEY = 'pht_cache_warmed';
const APP_START_MS = typeof window !== 'undefined' ? Date.now() : 0;

/** Block all localStorage reads/writes immediately after load (ms). */
export const STARTUP_STORAGE_BLOCK_MS = 30_000;

export function isStartupStorageBlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return Date.now() - APP_START_MS < STARTUP_STORAGE_BLOCK_MS;
}

export function isLiteMode(): boolean {
  if (typeof window === 'undefined') return false;
  const qs = new URLSearchParams(window.location.search);
  return qs.get('lite') === '1' || import.meta.env.VITE_LITE_MODE === '1';
}

/**
 * Schnellmodus (default): Supabase only, no live multi-provider scan on startup.
 * Opt out: ?full=1 or VITE_FAST_MODE=0
 */
export function isFastMode(): boolean {
  if (typeof window === 'undefined') return true;
  const qs = new URLSearchParams(window.location.search);
  if (qs.get('full') === '1') return false;
  return import.meta.env.VITE_FAST_MODE !== '0';
}

/** Supabase only – never fall back to live multi-provider search (default on). */
export function isServerOnlyMode(): boolean {
  if (typeof window === 'undefined') return true;
  const qs = new URLSearchParams(window.location.search);
  if (qs.get('live') === '1') return false;
  if (qs.get('server') === '0') return false;
  if (!isFastMode()) return false;
  return qs.get('server') === '1' || import.meta.env.VITE_SERVER_ONLY !== '0' || isFastMode();
}

/** Opt in to phased startup (?progressive=1). */
export function isLegacyStartup(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('legacy') === '1';
}

/** Progressive multi-phase startup – off by default (use Schnellmodus). */
export function isProgressiveStartup(): boolean {
  if (typeof window === 'undefined') return false;
  if (isLegacyStartup()) return false;
  if (isFastMode()) return false;
  const qs = new URLSearchParams(window.location.search);
  return qs.get('progressive') === '1' || import.meta.env.VITE_PROGRESSIVE_STARTUP === '1';
}

/** Skip localStorage tender cache reads on this session. */
export function isCacheDisabled(): boolean {
  if (typeof window === 'undefined') return true;
  if (isStartupStorageBlocked()) return true;
  if (import.meta.env.VITE_DISABLE_TENDER_CACHE === '1') return true;
  if (new URLSearchParams(window.location.search).get('nocache') === '1') return true;
  try {
    return sessionStorage.getItem(SESSION_CACHE_KEY) !== '1';
  } catch {
    return true;
  }
}

/** Skip localStorage on first paint – Schnellmodus default. */
export function skipCacheOnStartup(): boolean {
  if (isStartupStorageBlocked()) return true;
  if (isCacheDisabled()) return true;
  if (isProgressiveStartup()) return true;
  return isFastMode();
}

export function markCacheSessionWarmed(): void {
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function initialVisibleTenderCount(): number {
  return 20;
}

/** Live multi-provider search – only on manual „Vollständige Suche“. */
export function allowsLiveProviders(): boolean {
  return !isServerOnlyMode();
}
