import { AlertTriangle, ChevronRight, Mail, MapPin, Users } from 'lucide-react';
import { useMemo } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import type { CustomerVisitStore } from '../../types/customerPriority';
import { computeDataHealth } from '../../services/dataHealth';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader } from '../ui/Card';

export type DataHealthIssue =
  | 'duplicates'
  | 'missingEmail'
  | 'missingPlz'
  | 'overdueA'
  | 'plzCorrected';

interface DataHealthPanelProps {
  customers: CustomerPriority[];
  store: CustomerVisitStore;
  onFilterIssue?: (issue: DataHealthIssue) => void;
  onExportMissingEmails?: () => void;
}

export function DataHealthPanel({
  customers,
  store,
  onFilterIssue,
  onExportMissingEmails,
}: DataHealthPanelProps) {
  const metrics = useMemo(
    () => computeDataHealth(customers, store),
    [customers, store],
  );

  const rows: {
    id: DataHealthIssue;
    label: string;
    count: number;
    detail: string;
    warn: boolean;
    action: string;
    icon: typeof Mail;
    onAction?: () => void;
  }[] = [
    {
      id: 'duplicates',
      label: 'Duplikat-Kandidaten',
      count: metrics.duplicateCandidateCount,
      detail: metrics.duplicateGroups.length > 0
        ? metrics.duplicateGroups[0].label
        : 'Keine offensichtlichen Duplikate',
      warn: metrics.duplicateCandidateCount > 0,
      action: 'Duplikate anzeigen',
      icon: Users,
    },
    {
      id: 'missingEmail',
      label: 'Fehlende E-Mail',
      count: metrics.missingEmailCount,
      detail: 'Kontakt-E-Mail fehlt – Hunter/Scraping oder manuell ergänzen',
      warn: metrics.missingEmailCount > 0,
      action: onExportMissingEmails ? 'Liste exportieren' : 'In Liste filtern',
      icon: Mail,
      onAction: onExportMissingEmails,
    },
    {
      id: 'missingPlz',
      label: 'Fehlende PLZ',
      count: metrics.missingPlzCount,
      detail: 'Ohne PLZ keine Gebietszuordnung / Routenplanung',
      warn: metrics.missingPlzCount > 0,
      action: 'Ohne PLZ anzeigen',
      icon: MapPin,
    },
    {
      id: 'overdueA',
      label: 'Überfällige A-Kunden',
      count: metrics.overdueACount,
      detail: 'Priorität A mit überfälligem Besuch – jetzt kontaktieren',
      warn: metrics.overdueACount > 0,
      action: 'Überfällige anzeigen',
      icon: AlertTriangle,
    },
    {
      id: 'plzCorrected',
      label: 'PLZ korrigiert',
      count: metrics.plzCorrectedCount,
      detail: 'Per Nominatim bereinigt (Qualitäts-Info)',
      warn: false,
      action: 'Korrigierte anzeigen',
      icon: MapPin,
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
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                if (row.onAction && row.id === 'missingEmail') row.onAction();
                else onFilterIssue?.(row.id);
              }}
              className={`text-left p-3 rounded-xl border transition-colors ${
                row.warn
                  ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                  : 'border-dark-500/50 bg-dark-800/40 hover:border-dark-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Icon className="w-3 h-3 shrink-0" />
                  {row.label}
                </p>
                {row.warn ? (
                  <Badge variant="warning">{row.count}</Badge>
                ) : (
                  <Badge variant="muted">{row.count}</Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{row.detail}</p>
              {onFilterIssue && (
                <span className="text-[10px] text-pht-400 mt-1 inline-flex items-center gap-0.5">
                  {row.action} <ChevronRight className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
