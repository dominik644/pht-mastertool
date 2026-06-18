import { Info } from 'lucide-react';

interface PortfolioFilterInfoChipProps {
  filteredCount: number;
  totalApprox: number;
}

/** Kurzer Hinweis: Portfolio-Filter reduziert die Trefferzahl auf PHT-relevante Ausschreibungen. */
export function PortfolioFilterInfoChip({ filteredCount, totalApprox }: PortfolioFilterInfoChipProps) {
  if (totalApprox <= 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-pht-500/30 bg-pht-600/10 text-xs text-pht-200"
      title="Nur Ausschreibungen mit PHT-Portfolio-Bezug (Katalog-Score, Lebensmittelanlage oder Equipment-CPV)"
    >
      <Info className="w-3.5 h-3.5 shrink-0" />
      {filteredCount} von ~{totalApprox.toLocaleString('de-DE')} nach Portfolio-Filter (nur PHT-relevante)
    </span>
  );
}
