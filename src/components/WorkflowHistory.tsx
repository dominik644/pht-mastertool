import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { History } from 'lucide-react';
import { useTenders } from '../context/TenderContext';
import { Card, CardContent, CardHeader } from './ui/Card';

export function WorkflowHistory() {
  const { workflowHistory } = useTenders();
  const recent = workflowHistory.slice(0, 10);
  if (recent.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" /> Letzte Workflow-Aktivitäten
        </h2>
      </CardHeader>
      <CardContent className="space-y-2">
        {recent.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 text-sm py-2 border-b border-dark-500/30 last:border-0">
            <div className="text-xs text-slate-600 shrink-0 w-28">{format(parseISO(entry.timestamp), 'dd.MM. HH:mm', { locale: de })}</div>
            <div className="min-w-0">
              <p className="text-slate-300 truncate">{entry.tenderTitle}</p>
              <p className="text-xs text-slate-600 mt-0.5">{entry.fromStatus ? `${entry.fromStatus} → ` : ''}<strong className="text-slate-400">{entry.toStatus}</strong></p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
