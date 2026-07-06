import { Calendar } from 'lucide-react';
import { useState } from 'react';

interface PlanInOutlookButtonProps {
  onPlan: () => Promise<{ success: boolean; message: string }>;
  label?: string;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}

export function PlanInOutlookButton({
  onPlan,
  label = 'In Outlook planen',
  compact = false,
  className = '',
  disabled = false,
}: PlanInOutlookButtonProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const result = await onPlan();
      setStatus(result.message);
      window.setTimeout(() => setStatus(null), 4500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || busy}
        className={`flex items-center gap-1.5 rounded-lg border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 disabled:opacity-50 ${
          compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs min-h-[36px]'
        }`}
      >
        <Calendar className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        {busy ? '…' : label}
      </button>
      {status && (
        <p className={`mt-1 ${compact ? 'text-[9px]' : 'text-[10px]'} text-slate-500 leading-snug`}>
          {status}
        </p>
      )}
    </div>
  );
}
