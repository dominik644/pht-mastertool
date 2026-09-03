import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import type { CustomerVisitStore } from '../../types/customerPriority';
import { computeDataHealth } from '../../services/dataHealth';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader } from '../ui/Card';

interface DataHealthPanelProps {
  customers: CustomerPriority[];
  store: CustomerVisitStore;
  onFilterIssue?: (issue: 'duplicates' | 'missingEmail' | 'overdueA' | 'plzCorrected') => void;
}

export function DataHealthPanel({ customers, store, onFilterIssue }: DataHealthPanelProps) {
  const metrics = useMemo(
    () => computeDataHealth(customers, store),
    [customers, store],
  );

  const rows = [
    {
      id: 'duplicates' as const,
      label: 'Duplikat-Kandidaten',
      count: metrics.duplicateCandidateCount,
      detail: metrics.duplicateGroups.length > 0
        ? metrics.duplicateGroups[0].label
        : 'Keine offensichtlichen Duplikate',
      warn: metrics.duplicateCandidateCount > 0,
    },
    {
      id: 'missingEmail' as const,
      label: 'Fehlende E-Mail',
      count: metrics.missingEmailCount,
      detail: 'Im gefilterten Territorium ohne Kontakt-E-Mail',
      warn: metrics.missingEmailCount > 0,
    },
    {
      id: 'overdueA' as const,
      label: 'Überfällige A-Kunden',
      count: metrics.overdueACount,
      detail: 'Priorität A mit überfälligem Besuch',
      warn: metrics.overdueACount > 0,
    },
    {
      id: 'plzCorrected' as const,
      label: 'PLZ korrigiert',
      count: metrics.plzCorrectedCount,
      detail: 'Per Nominatim bereinigt (Info)',
      warn: false,
    },
  ];

  return (
    <Card className="mb-4 print:hidden">
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Daten-Gesundheit
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Qualität im aktuellen Territorium · {customers.length} Kunden
        </p>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-2">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onFilterIssue?.(row.id)}
            className={`text-left p-3 rounded-xl border transition-colors ${
              row.warn
                ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                : 'border-dark-500/50 bg-dark-800/40 hover:border-dark-400'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400">{row.label}</p>
              {row.warn ? (
                <Badge variant="warning">{row.count}</Badge>
              ) : (
                <Badge variant="muted">{row.count}</Badge>
              )}
            </div>
            <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{row.detail}</p>
            {onFilterIssue && (
              <span className="text-[10px] text-pht-400 mt-1 inline-flex items-center gap-0.5">
                Filter anwenden <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
