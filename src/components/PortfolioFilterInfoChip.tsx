import { Info } from 'lucide-react';

interface PortfolioFilterInfoChipProps {
  filteredCount: number;
  loadedCount: number;
}

/** Kurzer Hinweis: Portfolio-Filter reduziert die Trefferzahl auf PHT-Ausrüstung. */
export function PortfolioFilterInfoChip({ filteredCount, loadedCount }: PortfolioFilterInfoChipProps) {
  if (loadedCount <= 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-pht-500/30 bg-pht-600/10 text-xs text-pht-200"
      title="Nur PHT-Ausrüstung: Katalog-Score, Equipment-CPV oder LM-Geräte-Chance mit Gerätesignal – keine Reinigungsdienste/Bau"
    >
      <Info className="w-3.5 h-3.5 shrink-0" />
      {filteredCount} von {loadedCount.toLocaleString('de-DE')} geladen · Portfolio-Filter aktiv
    </span>
  );
}
