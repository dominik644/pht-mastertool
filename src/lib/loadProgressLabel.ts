import type { TenderLoadProgress } from '../context/TenderContext';

/** User-facing progress line for header / dashboard. */
export function formatLoadProgressLabel(progress: TenderLoadProgress | null): string | null {
  if (!progress || progress.phase === 'idle' || progress.phase === 'done') return null;

  const loaded = progress.loaded.toLocaleString('de-DE');
  const estimated = progress.estimated.toLocaleString('de-DE');

  if (progress.phase === 'live' && progress.providersTotal > 0) {
    return `${loaded} von ~${estimated} Ausschreibungen · ${progress.providersDone}/${progress.providersTotal} Quellen`;
  }

  return `${loaded} von ${estimated} geladen`;
}

/** Schnellmodus pagination – PHT-relevante Treffer (nicht Roh-DB-Zeilen). */
export function formatPaginationProgress(loaded: number, total: number, hasMore: boolean): string {
  const loadedFmt = loaded.toLocaleString('de-DE');
  if (total > 0) {
    const totalFmt = total.toLocaleString('de-DE');
    return hasMore
      ? `${loadedFmt} von ~${totalFmt} PHT-relevanten geladen`
      : `${loadedFmt} von ${totalFmt} PHT-relevanten geladen`;
  }
  return `${loadedFmt} geladen`;
}
