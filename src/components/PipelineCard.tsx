import { ChevronLeft, ChevronRight, ExternalLink, Trash2 } from 'lucide-react';
import { formatPriceListAmount } from '../data/priceList2026';
import type { SalesPipelineEntry, SalesPipelineStage } from '../types/salesPipeline';
import { SALES_PIPELINE_STAGES } from '../types/salesPipeline';

const STAGE_ORDER = SALES_PIPELINE_STAGES.map((s) => s.stage);

function nextStage(stage: SalesPipelineStage): SalesPipelineStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  const next = STAGE_ORDER[idx + 1];
  return next === 'Verloren' && stage !== 'Verhandlung' ? null : next;
}

function prevStage(stage: SalesPipelineStage): SalesPipelineStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}

interface PipelineCardProps {
  entry: SalesPipelineEntry;
  onMove: (id: string, stage: SalesPipelineStage) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<SalesPipelineEntry>) => void;
}

export function PipelineCard({ entry, onMove, onDelete, onUpdate }: PipelineCardProps) {
  const forecast = entry.estimatedValue * (entry.probability / 100);
  const prev = prevStage(entry.stage);
  const next = nextStage(entry.stage);

  return (
    <article className="rounded-lg border border-dark-500/50 bg-dark-700/40 p-3 space-y-2">
      <h4 className="text-sm font-medium text-white leading-snug line-clamp-2">{entry.title}</h4>
      <div className="flex flex-wrap gap-1 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-dark-600 text-slate-400">{entry.sourceType}</span>
        {entry.country && <span className="px-1.5 py-0.5 rounded bg-dark-600 text-slate-500">{entry.country}</span>}
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div>
          <span className="text-slate-600 block">Geschätzt</span>
          <span className="text-slate-300">{formatPriceListAmount(entry.estimatedValue)}</span>
        </div>
        <div>
          <span className="text-slate-600 block">Forecast</span>
          <span className="text-pht-300">{formatPriceListAmount(forecast)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-slate-600 shrink-0">Wahrsch.</label>
        <input
          type="range"
          min={5}
          max={95}
          step={5}
          value={entry.probability}
          onChange={(e) => onUpdate(entry.id, { probability: Number(e.target.value) })}
          className="flex-1 h-1 accent-pht-500"
        />
        <span className="text-xs text-slate-400 w-8">{entry.probability}%</span>
      </div>
      <div className="flex items-center gap-1 pt-1">
        {prev && entry.stage !== 'Gewonnen' && entry.stage !== 'Verloren' && (
          <button
            type="button"
            onClick={() => onMove(entry.id, prev)}
            className="p-1.5 rounded border border-dark-500 text-slate-500 hover:text-white"
            title="Zurück"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {next && entry.stage !== 'Gewonnen' && entry.stage !== 'Verloren' && (
          <button
            type="button"
            onClick={() => onMove(entry.id, next)}
            className="p-1.5 rounded border border-pht-500/40 text-pht-400 hover:bg-pht-600/10"
            title="Weiter"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {entry.stage === 'Verhandlung' && (
          <>
            <button type="button" onClick={() => onMove(entry.id, 'Gewonnen')} className="text-[10px] px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">Gewonnen</button>
            <button type="button" onClick={() => onMove(entry.id, 'Verloren')} className="text-[10px] px-2 py-1 rounded bg-red-600/20 text-red-400 border border-red-500/30">Verloren</button>
          </>
        )}
        {entry.sourceUrl && (
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-slate-500 hover:text-sky-400 ml-auto">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button type="button" onClick={() => onDelete(entry.id)} className="p-1.5 rounded text-slate-600 hover:text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
}
