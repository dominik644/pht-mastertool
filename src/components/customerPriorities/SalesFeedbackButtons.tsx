import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getCustomerFeedback,
  recordFeedback,
  SALES_FEEDBACK_CHANGED_EVENT,
  type LeadRating,
} from '../../services/salesLearning';

interface SalesFeedbackButtonsProps {
  customerId: string;
  sector: string;
  compact?: boolean;
}

export function SalesFeedbackButtons({ customerId, sector, compact }: SalesFeedbackButtonsProps) {
  const [rating, setRating] = useState<LeadRating>(null);

  useEffect(() => {
    const refresh = () => setRating(getCustomerFeedback(customerId)?.leadRating ?? null);
    refresh();
    window.addEventListener(SALES_FEEDBACK_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SALES_FEEDBACK_CHANGED_EVENT, refresh);
  }, [customerId]);

  const setRatingAndSave = (value: LeadRating) => {
    const next = rating === value ? null : value;
    recordFeedback(customerId, { leadRating: next, sectorHit: sector });
    setRating(next);
  };

  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'gap-1.5'}`} title="Lern-Feedback für Prioritäts-Scoring">
      <button
        type="button"
        onClick={() => setRatingAndSave('good')}
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
        onClick={() => setRatingAndSave('bad')}
        className={`p-1.5 rounded-lg border min-h-[32px] min-w-[32px] flex items-center justify-center ${
          rating === 'bad'
            ? 'border-red-500/50 bg-red-500/15 text-red-400'
            : 'border-dark-500 text-slate-500 hover:text-red-400'
        }`}
        aria-label="Schlechter Lead"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
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
