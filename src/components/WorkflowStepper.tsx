import { Check } from 'lucide-react';
import { WORKFLOW_STAGES } from '../data/workflow';
import { getStageIndex } from '../services/workflow';
import type { PipelineStatus } from '../types/tender';

interface WorkflowStepperProps {
  currentStatus: PipelineStatus;
  onStatusClick?: (status: PipelineStatus) => void;
  compact?: boolean;
}

export function WorkflowStepper({ currentStatus, onStatusClick, compact = false }: WorkflowStepperProps) {
  const currentIdx = getStageIndex(currentStatus);

  return (
    <div className={compact ? 'overflow-x-auto pb-2' : ''}>
      <div className={`flex items-center ${compact ? 'min-w-max gap-1' : 'gap-0'}`}>
        {WORKFLOW_STAGES.map((stage, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={stage.status} className={`flex items-center ${compact ? '' : 'flex-1'}`}>
              <button type="button" onClick={() => onStatusClick?.(stage.status)} disabled={!onStatusClick}
                className={`flex flex-col items-center ${onStatusClick ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
                  isCurrent ? 'bg-pht-600 border-pht-500 text-white ring-4 ring-pht-500/20' :
                  isPast ? 'bg-emerald-500/80 border-emerald-500 text-white' :
                  'bg-dark-600 border-dark-500 text-slate-500'
                }`}>
                  {isPast ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                {!compact && <span className={`mt-2 text-xs text-center max-w-[72px] leading-tight ${isCurrent ? 'font-semibold text-pht-400' : 'text-slate-500'}`}>{stage.label}</span>}
              </button>
              {idx < WORKFLOW_STAGES.length - 1 && <div className={`h-0.5 ${compact ? 'w-6 mx-1' : 'flex-1 mx-2'} ${idx < currentIdx ? 'bg-emerald-500/50' : 'bg-dark-500'}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
