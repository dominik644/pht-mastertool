import { DEV_SYNC_WARN_MS, SYNC_FRAME_BUDGET_MS } from './performanceConstants';

const isDev = import.meta.env.DEV;

/** Yield control so the browser can paint and handle input. */
export function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 16 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export function warnIfSlowSync(label: string, elapsedMs: number): void {
  if (isDev && elapsedMs > DEV_SYNC_WARN_MS) {
    console.warn(`[perf] Slow sync work "${label}" took ${Math.round(elapsedMs)}ms`);
  }
}

/** Run sync fn and warn in dev when it exceeds the budget. */
export function runWithSyncBudget<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  warnIfSlowSync(label, performance.now() - start);
  return result;
}

/**
 * Process items in chunks, yielding when a frame budget is exceeded.
 */
export async function processItemsWithBudget<T>(
  items: readonly T[],
  process: (item: T, index: number) => void,
  options?: { chunkSize?: number; label?: string },
): Promise<void> {
  const chunkSize = options?.chunkSize ?? 20;
  const label = options?.label ?? 'processItemsWithBudget';
  let index = 0;

  while (index < items.length) {
    const frameStart = performance.now();
    const end = Math.min(index + chunkSize, items.length);
    for (; index < end; index += 1) {
      process(items[index], index);
      if (performance.now() - frameStart >= SYNC_FRAME_BUDGET_MS) {
        break;
      }
    }
    warnIfSlowSync(label, performance.now() - frameStart);
    if (index < items.length) {
      await yieldToMainThread();
    }
  }
}
