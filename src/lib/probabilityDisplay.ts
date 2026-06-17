/** Color classes for precomputed probability badges (display only – no math). */

export function probBadgeClass(value: number): string {
  if (value >= 70) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (value >= 50) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

export function formatProb(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}
