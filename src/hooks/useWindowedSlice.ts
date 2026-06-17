import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_VISIBLE_TENDER_COUNT, LIST_WINDOW_STEP } from '../lib/performanceConstants';
import { initialVisibleTenderCount } from '../lib/startupFlags';

/**
 * Scroll-windowed list: render a small initial slice, expand on scroll near bottom.
 */
export function useWindowedSlice<T>(
  items: readonly T[],
  initialCount = initialVisibleTenderCount() || INITIAL_VISIBLE_TENDER_COUNT,
  step = LIST_WINDOW_STEP,
) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(initialCount, items.length),
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(Math.min(initialCount, items.length));
  }, [items, initialCount]);

  const expand = useCallback(() => {
    setVisibleCount((current) => Math.min(current + step, items.length));
  }, [items.length, step]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= items.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) expand();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, items.length, expand]);

  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return { visible, hasMore, total: items.length, visibleCount, sentinelRef };
}
