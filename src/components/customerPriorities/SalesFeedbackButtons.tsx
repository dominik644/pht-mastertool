import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getCustomerFeedback,
  recordFeedback,
  SALES_FEEDBACK_CHANGED_EVENT,
  type LeadRating,
} from '../../services/salesLearning';
import { LeadFeedbackReasonDialog } from './LeadFeedbackReasonDialog';

interface SalesFeedbackButtonsProps {
  customerId: string;
  customerName: string;
  sector: string;
  compact?: boolean;
  /** Neukunden: Begründung ist Pflicht */
  requireReason?: boolean;
}

export function SalesFeedbackButtons({
  customerId,
  customerName,
  sector,
  compact,
  requireReason = false,
}: SalesFeedbackButtonsProps) {
  const [rating, setRating] = useState<LeadRating>(null);
  const [pendingRating, setPendingRating] = useState<'good' | 'bad' | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const fb = getCustomerFeedback(customerId);
      setRating(fb?.leadRating ?? null);
    };
    refresh();
    window.addEventListener(SALES_FEEDBACK_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SALES_FEEDBACK_CHANGED_EVENT, refresh);
  }, [customerId]);

  const openReasonDialog = (value: 'good' | 'bad') => {
    setPendingRating(value);
    setReasonOpen(true);
  };

  const handleThumbClick = (value: 'good' | 'bad') => {
    openReasonDialog(value);
  };

  const handleReasonConfirm = (reason: string, reasonTags: string[]) => {
    if (!pendingRating) return;
    recordFeedback(
      customerId,
      {
        leadRating: pendingRating,
        sectorHit: sector,
        leadReason: reason,
        reasonTags,
      },
      { sector, name: customerName },
    );
    setRating(pendingRating);
    setReasonOpen(false);
    setPendingRating(null);
  };

  const handleReasonCancel = () => {
    setReasonOpen(false);
    setPendingRating(null);
  };

  const fb = getCustomerFeedback(customerId);
  const hasReason = Boolean(fb?.leadReason || fb?.reasonTags?.length);

  return (
    <>
      <div
        className={`flex items-center gap-1 ${compact ? '' : 'gap-1.5'}`}
        title={
          requireReason
            ? 'Neukunde: Daumen + Begründung (Pflicht) – verbessert die automatische Suche'
            : 'Lern-Feedback für Neukunden & Prioritäts-Scoring'
        }
      >
        <button
          type="button"
          onClick={() => handleThumbClick('good')}
          className={`p-1.5 rounded-lg border min-h-[32px] min-w-[32px] flex items-center justify-center ${
            rating === 'good'
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
              : 'border-dark-500 text-slate-500 hover:text-emerald-400'
          }`}
          aria-label="Guter Lead"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleThumbClick('bad')}
          className={`p-1.5 rounded-lg border min-h-[32px] min-w-[32px] flex items-center justify-center ${
            rating === 'bad'
              ? 'border-red-500/50 bg-red-500/15 text-red-400'
              : 'border-dark-500 text-slate-500 hover:text-red-400'
          }`}
          aria-label="Schlechter Lead"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
        {rating && hasReason && (
          <span className="text-[9px] text-slate-600 max-w-[6rem] truncate hidden sm:inline" title={fb?.leadReason}>
            {fb?.leadReason}
          </span>
        )}
      </div>

      <LeadFeedbackReasonDialog
        open={reasonOpen}
        rating={pendingRating ?? 'good'}
        customerName={customerName}
        onCancel={handleReasonCancel}
        onConfirm={handleReasonConfirm}
      />
    </>
  );
}

interface VisitRelevanceToggleProps {
  customerId: string;
  sector: string;
}

export function VisitRelevanceToggle({ customerId, sector }: VisitRelevanceToggleProps) {
  const [relevant, setRelevant] = useState<boolean | null>(null);

  useEffect(() => {
    const refresh = () => setRelevant(getCustomerFeedback(customerId)?.visitRelevant ?? null);
    refresh();
    window.addEventListener(SALES_FEEDBACK_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SALES_FEEDBACK_CHANGED_EVENT, refresh);
  }, [customerId]);

  const toggle = (value: boolean) => {
    const next = relevant === value ? null : value;
    recordFeedback(customerId, { visitRelevant: next, sectorHit: sector });
    setRelevant(next);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-500">War relevant?</span>
      <button
        type="button"
        onClick={() => toggle(true)}
        className={`px-2.5 py-1 rounded-lg text-xs border ${
          relevant === true
            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
            : 'border-dark-500 text-slate-400 hover:bg-dark-700'
        }`}
      >
        Ja
      </button>
      <button
        type="button"
        onClick={() => toggle(false)}
        className={`px-2.5 py-1 rounded-lg text-xs border ${
          relevant === false
            ? 'border-red-500/50 bg-red-500/10 text-red-300'
            : 'border-dark-500 text-slate-400 hover:bg-dark-700'
        }`}
      >
        Nein
      </button>
    </div>
  );
}
