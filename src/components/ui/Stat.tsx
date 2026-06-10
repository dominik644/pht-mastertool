import type { LucideIcon } from 'lucide-react';

interface StatProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: string;
  accent?: string;
}

export function Stat({ label, value, icon: Icon, trend, color = 'text-pht-400', accent = 'from-pht-600/20 to-pht-500/5' }: StatProps) {
  return (
    <div className={`rounded-xl border border-dark-500/60 bg-gradient-to-br ${accent} p-5 backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-white">{value}</p>
          {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-dark-600/80 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
