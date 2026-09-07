import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../ui/Card';

export function SnapaddySettings() {
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/api/snapaddy`
    : 'https://pht-mastertool.vercel.app/api/snapaddy';

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-pht-300" />
          Snapaddy Visitenkarten
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Im Tool stehen die Karten in der{' '}
          <Link to="/priorities" className="text-pht-400 hover:text-pht-300">Tourenplanung</Link>
          {' '}ganz oben in der Box „Snapaddy Visitenkarten“.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-slate-400">
        <p>
          Vom Handy: „CRM“ sendet nicht an unser Tool. In Snapaddy <strong className="text-slate-300">Excel</strong> exportieren
          und die Datei in der Tourenplanung hochladen — oder den Kontakt kurz eintragen.
        </p>
        <p>
          Vom PC (optional): Snapaddy → Einstellungen → Systemintegration → snapAddy API.
          Methode <strong className="text-slate-300">POST</strong>, URL{' '}
          <code className="text-pht-300 break-all">{url}</code>,
          Header <code className="text-slate-300">Authorization: Bearer …</code>
          (gleicher Wert wie <code className="text-slate-300">SNAPADDY_WEBHOOK_SECRET</code>).
        </p>
      </CardContent>
    </Card>
  );
}
