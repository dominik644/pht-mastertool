/**
 * Central performance & stability limits for the tender UI.
 * Tune here when adjusting chunk sizes, caps, or cache bounds.
 */

/** Max synchronous work per frame before yielding to the browser (ms). */
export const SYNC_FRAME_BUDGET_MS = 12;

/** Items processed per chunk during idle/chunked pipelines. */
export const REPROCESS_CHUNK_SIZE = 25;

/** Items added to the DOM per expansion step in windowed lists. */
export const LIST_WINDOW_STEP = 40;

/** Initial tender cards rendered before progressive expansion. */
export const INITIAL_VISIBLE_TENDER_COUNT = 60;

/** Dev-only warning threshold for synchronous work (ms). */
export const DEV_SYNC_WARN_MS = 100;

/** localStorage tender cache – max serialized size (~5 MB). */
export const STORAGE_MAX_BYTES = 5 * 1024 * 1024;

/** localStorage tender cache – max tender records kept. */
export const STORAGE_MAX_TENDERS = 2000;

/** Debounce before persisting tenders to localStorage (ms). */
export const STORAGE_SAVE_DEBOUNCE_MS = 400;

/** Auto-refresh interval for live tender fetch (ms). */
export const AUTO_REFRESH_MS = 60 * 60 * 1000;

/** Live search timeout – desktop (ms). */
export const LIVE_SEARCH_TIMEOUT_MS = 50_000;

/** Live search timeout – mobile (ms). */
export const MOBILE_LIVE_SEARCH_TIMEOUT_MS = 35_000;

/** Translation API – texts per batch request. */
export const TRANSLATE_BATCH_SIZE = 8;

/** Translation API – delay between batches (ms). */
export const TRANSLATE_BATCH_DELAY_MS = 150;

/** Translation – max cached entries (memory + localStorage). */
export const TRANSLATE_CACHE_MAX = 400;

/** Translation – consecutive API failures before circuit opens. */
export const TRANSLATE_CIRCUIT_FAILURE_THRESHOLD = 3;

/** Translation – circuit breaker cool-down (ms). */
export const TRANSLATE_CIRCUIT_OPEN_MS = 60_000;

/** Translation – max API calls per rolling minute. */
export const TRANSLATE_MAX_REQUESTS_PER_MINUTE = 30;

/** Idle callback timeout when scheduling heavy work (ms). */
export const IDLE_WORK_TIMEOUT_MS = 120;
