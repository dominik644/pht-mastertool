import { useEffect, useState } from 'react';
import { INITIAL_VISIBLE_TENDER_COUNT, LIST_WINDOW_STEP } from '../lib/performanceConstants';
import { initialVisibleTenderCount } from '../lib/startupFlags';

/**
 * Progressively expand a list slice so initial render stays bounded.
 */
export function useWindowedSlice<T>(
  items: readonly T[],
  initialCount = initialVisibleTenderCount() || INITIAL_VISIBLE_TENDER_COUNT,
  step = LIST_WINDOW_STEP,
) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(initialCount, items.length),
  );

  useEffect(() => {
    setVisibleCount(Math.min(initialCount, items.length));
  }, [items, initialCount]);

  useEffect(() => {
    if (visibleCount >= items.length) return undefined;
    const frame = requestAnimationFrame(() => {
      setVisibleCount((current) => Math.min(current + step, items.length));
    });
    return () => cancelAnimationFrame(frame);
  }, [visibleCount, items.length, step]);

  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return { visible, hasMore, total: items.length, visibleCount };
}
