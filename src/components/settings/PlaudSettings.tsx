import { Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../ui/Card';

export function PlaudSettings() {
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/api/plaud`
    : 'https://pht-mastertool.vercel.app/api/plaud';

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Mic className="w-4 h-4 text-pht-300" />
          Plaud Note
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Im Tool:{' '}
          <Link to="/plaud" className="text-pht-400 hover:text-pht-300">Plaud-Notizen</Link>
          {' '}— Transkripte & Summaries aus dem Plaud-Gerät.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-slate-400">
        <p>
          <strong className="text-slate-300">Setup:</strong> Plaud Web → Explore → Integrations → Zapier.
          Trigger: <strong className="text-slate-300">Transcript & Summary Ready</strong>.
        </p>
        <p>
          Action: <strong className="text-slate-300">Webhooks by Zapier → POST</strong> an{' '}
          <code className="text-pht-300 break-all">{url}</code>
        </p>
        <p>
          Header: <code className="text-slate-300">Authorization: Bearer …</code>
          (gleicher Wert wie <code className="text-slate-300">PLAUD_WEBHOOK_SECRET</code>).
          Alternativ denselben Schlüssel als <code className="text-slate-300">?token=…</code> an die URL hängen.
        </p>
        <p>
          Felder mappen: <code className="text-slate-300">title</code>,{' '}
          <code className="text-slate-300">transcript</code>,{' '}
          <code className="text-slate-300">summary</code>, optional{' '}
          <code className="text-slate-300">actionItems</code>,{' '}
          <code className="text-slate-300">recordedAt</code>.
        </p>
        <p>
          Notizen werden in Supabase gespeichert und bleiben nach Deploy/Neustart erhalten.
        </p>
      </CardContent>
    </Card>
  );
}
