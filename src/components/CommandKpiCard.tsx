import { Calendar, CheckSquare, ChevronRight, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMicrosoftAuth } from '../context/MicrosoftAuthContext';
import type { Tender } from '../types/tender';
import { bulkCalendarForTenders, bulkTodosForTenders, sendSummaryEmail } from '../services/microsoftIntegrations';
import { Card, CardContent } from './ui/Card';

interface CommandKpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  valueClass?: string;
  to?: string;
  onSelect?: () => void;
  tenders?: Tender[];
  summaryEmail?: { subject: string; body: string };
}

export function CommandKpiCard({
  label,
  value,
  subtext,
  valueClass = 'text-white',
  to,
  onSelect,
  tenders,
  summaryEmail,
}: CommandKpiCardProps) {
  const { targetEmail } = useMicrosoftAuth();
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const interactive = Boolean(to || onSelect);
  const hasBulk = (tenders?.length ?? 0) > 0;
  const hasEmail = hasBulk || summaryEmail;

  const run = async (fn: () => Promise<{ message: string }>) => {
    setBusy(true);
    setHint(null);
    try {
      const r = await fn();
      setHint(r.message);
    } finally {
      setBusy(false);
    }
  };

  const mainClass = `block w-full text-left ${interactive ? 'cursor-pointer group-hover:text-pht-300' : ''}`;

  const mainContent = (
    <>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      {subtext && <p className="text-[10px] text-slate-600">{subtext}</p>}
      {interactive && (
        <p className="text-[10px] text-pht-400/70 mt-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          Anzeigen <ChevronRight className="w-3 h-3" />
        </p>
      )}
    </>
  );

  return (
    <Card className="group hover:border-pht-500/40 transition-colors">
      <CardContent className="py-4">
        {to ? (
          <Link to={to} className={mainClass}>{mainContent}</Link>
        ) : onSelect ? (
          <button type="button" onClick={onSelect} className={mainClass}>{mainContent}</button>
        ) : (
          <div>{mainContent}</div>
        )}

        {hasEmail && (
          <div className="flex gap-1 mt-3 pt-3 border-t border-dark-500/50" onClick={(e) => e.stopPropagation()}>
            {hasBulk && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  title={`Alle Termine → ${targetEmail}`}
                  onClick={() => run(() => bulkCalendarForTenders(tenders!))}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dark-500 text-[10px] text-slate-400 hover:text-white hover:bg-dark-600 disabled:opacity-40"
                >
                  <Calendar className="w-3 h-3" /> Kalender
                </button>
                <button
                  type="button"
                  disabled={busy}
                  title={`Alle Aufgaben → ${targetEmail}`}
                  onClick={() => run(() => bulkTodosForTenders(tenders!))}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dark-500 text-[10px] text-slate-400 hover:text-white hover:bg-dark-600 disabled:opacity-40"
                >
                  <CheckSquare className="w-3 h-3" /> To Do
                </button>
              </>
            )}
            <button
              type="button"
              disabled={busy}
              title={`Per E-Mail an ${targetEmail}`}
              onClick={() => {
                if (summaryEmail) run(() => sendSummaryEmail(summaryEmail.subject, summaryEmail.body));
                else if (hasBulk) run(() => bulkTodosForTenders(tenders!));
              }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-sky-500/30 text-[10px] text-sky-400 hover:bg-sky-500/10 disabled:opacity-40"
            >
              <Mail className="w-3 h-3" /> {targetEmail.split('@')[0]}
            </button>
          </div>
        )}

        {hint && <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">{hint}</p>}
      </CardContent>
    </Card>
  );
}
