import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { LEAD_REASON_PRESETS } from '../../services/discoveryLearning';

interface LeadFeedbackReasonDialogProps {
  open: boolean;
  rating: 'good' | 'bad';
  customerName: string;
  onCancel: () => void;
  onConfirm: (reason: string, reasonTags: string[]) => void;
}

export function LeadFeedbackReasonDialog({
  open,
  rating,
  customerName,
  onCancel,
  onConfirm,
}: LeadFeedbackReasonDialogProps) {
  const presets = useMemo(
    () => LEAD_REASON_PRESETS.filter(
      (p) => p.polarity === rating || p.id === 'other',
    ),
    [rating],
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedTags([]);
      setCustomReason('');
    }
  }, [open, rating, customerName]);

  if (!open) return null;

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const buildReasonText = (): string => {
    const labels = selectedTags
      .map((id) => LEAD_REASON_PRESETS.find((p) => p.id === id)?.label)
      .filter(Boolean);
    if (customReason.trim()) labels.push(customReason.trim());
    return labels.join(' · ');
  };

  const canSubmit = selectedTags.length > 0 || customReason.trim().length >= 3;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const tags = selectedTags.length ? selectedTags : ['other'];
    onConfirm(buildReasonText(), tags);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-dark-500 bg-dark-900 shadow-xl"
        role="dialog"
        aria-labelledby="feedback-reason-title"
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 border-b border-dark-500/50">
          <div>
            <h2 id="feedback-reason-title" className="text-sm font-semibold text-white">
              {rating === 'good' ? 'Warum ein guter Lead?' : 'Warum kein passender Lead?'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate">{customerName}</p>
          </div>
          <button type="button" onClick={onCancel} className="text-slate-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-400">
            Ihre Begründung verbessert die automatische Neukunden-Suche. Bitte mindestens einen Grund wählen.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active = selectedTags.includes(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => toggleTag(preset.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] border text-left ${
                    active
                      ? rating === 'good'
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                        : 'border-red-500/50 bg-red-500/15 text-red-200'
                      : 'border-dark-500 text-slate-400 hover:text-white hover:border-dark-400'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="text-xs text-slate-500">Ergänzung (optional)</span>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={2}
              placeholder="z. B. konkreter Anlagenbedarf, Kontext …"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-500 text-sm text-white resize-none"
            />
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40 ${
                rating === 'good' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg border border-dark-500 text-sm text-slate-400 hover:text-white"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
