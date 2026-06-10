import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: string;
  accent?: string;
  to?: string;
  onClick?: () => void;
}

export function Stat({ label, value, icon: Icon, trend, color = 'text-pht-400', accent = 'from-pht-600/20 to-pht-500/5', to, onClick }: StatProps) {
  const interactive = Boolean(to || onClick);
  const className = `rounded-xl border border-dark-500/60 bg-gradient-to-br ${accent} p-5 backdrop-blur-sm text-left w-full ${
    interactive ? 'hover:border-pht-500/50 hover:shadow-lg hover:shadow-pht-500/5 transition-all cursor-pointer active:scale-[0.98]' : ''
  }`;

  const content = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="mt-1 text-3xl font-bold text-white">{value}</p>
        {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
        {interactive && <p className="mt-2 text-[10px] text-pht-400/80 uppercase tracking-wide">Anzeigen →</p>}
      </div>
      <div className={`p-2.5 rounded-lg bg-dark-600/80 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );

  if (to) return <Link to={to} className={className}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={className}>{content}</button>;
  return <div className={className}>{content}</div>;
}
