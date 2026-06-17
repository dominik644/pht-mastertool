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

/** Initial tender cards rendered before progressive expansion (lite mode uses 20 via startupFlags). */
export const INITIAL_VISIBLE_TENDER_COUNT = 30;

/** First API page size – keeps first paint and scoring fast. */
export const STARTUP_FETCH_LIMIT = 50;

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

/** Delay before any tender reprocessing after first paint (ms). */
export const STARTUP_REPROCESS_DEFER_MS = 3_000;

/** Delay before live fetch after first paint (ms). */
export const STARTUP_FETCH_DEFER_MS = 800;

/** Progressive startup – 2nd Supabase batch from mount (ms). */
export const PROGRESSIVE_SUPABASE_PHASE2_MS = 4_000;

/** Progressive startup – live providers from mount (ms). */
export const PROGRESSIVE_LIVE_MS = 10_000;

/** Progressive Supabase page sizes after initial STARTUP_FETCH_LIMIT. */
export const PROGRESSIVE_SUPABASE_LIMIT_2 = 200;
export const PROGRESSIVE_SUPABASE_LIMIT_3 = 500;

/** Max tenders loaded synchronously from cache on startup (preview) – only when cache enabled. */
export const STARTUP_CACHE_PREVIEW_MAX = 50;

/** Web Worker reprocess – disabled until structured-clone cost is bounded. */
export const USE_REPROCESS_WORKER = false;
