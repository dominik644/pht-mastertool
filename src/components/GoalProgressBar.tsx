import { REVENUE_GOAL_EUR } from '../types/salesPipeline';

interface GoalProgressBarProps {
  current: number;
  goal?: number;
  label?: string;
  className?: string;
}

function formatEur(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} Mio. €`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k €`;
  return `${v.toLocaleString('de-DE')} €`;
}

export function GoalProgressBar({
  current,
  goal = REVENUE_GOAL_EUR,
  label = 'Ziel 1 Mio. € Umsatz',
  className = '',
}: GoalProgressBarProps) {
  const pct = Math.min(100, Math.round((current / goal) * 100));

  return (
    <div className={className}>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-xs text-slate-400">
          {formatEur(current)} / {formatEur(goal)} ({pct}%)
        </span>
      </div>
      <div className="h-3 rounded-full bg-dark-600 overflow-hidden border border-dark-500/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pht-600 to-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
