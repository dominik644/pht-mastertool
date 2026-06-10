interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted' | 'score';
  size?: 'sm' | 'md';
}

const variants = {
  default: 'bg-dark-600 text-slate-300 border border-dark-500',
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  muted: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  score: 'bg-pht-600/20 text-pht-400 border border-pht-500/30',
};

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
