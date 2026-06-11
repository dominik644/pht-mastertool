import { AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getReminderLabel } from '../services/reminders';
import { useTenders } from '../context/TenderContext';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';

const urgencyVariant = { critical: 'danger' as const, high: 'danger' as const, medium: 'warning' as const, low: 'info' as const };

export function RemindersPanel() {
  const { reminders } = useTenders();

  if (reminders.length === 0) {
    return (
      <Link to="/calendar" className="block">
        <Card className="h-full hover:border-pht-500/40 transition-colors cursor-pointer">
          <CardHeader><h2 className="text-sm font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" /> Erinnerungen</h2></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Keine anstehenden Deadlines.</p>
            <p className="text-xs text-pht-400 mt-2">Kalender öffnen →</p>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Erinnerungen ({reminders.length})
        </h2>
        <Link to="/calendar?filter=urgent" className="text-xs text-pht-400 hover:text-pht-300">Kalender →</Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {reminders.slice(0, 6).map((r) => (
          <Link key={r.tenderId} to={`/tenders/${r.tenderId}`} className="flex items-center justify-between p-2.5 rounded-lg bg-dark-600/30 hover:bg-dark-600/50 transition-colors">
            <div className="min-w-0 flex-1"><p className="text-sm text-slate-300 truncate">{r.tenderTitle}</p><p className="text-xs text-slate-600">{r.deadline}</p></div>
            <Badge variant={urgencyVariant[r.urgency]}>{getReminderLabel(r.daysLeft)}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
