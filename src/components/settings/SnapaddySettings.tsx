import { CreditCard } from 'lucide-react';
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
          Gescannte Karten aus der Snapaddy-App landen in der Kundenliste.
          Dort wählen Sie: neuer Kunde oder Kontakt zu einem bestehenden Kunden.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-slate-400">
        <p>In Snapaddy: <strong className="text-slate-300">Einstellungen → Systemintegration → snapAddy API</strong></p>
        <p>
          Ziel-URL:{' '}
          <code className="text-pht-300 break-all">{url}</code>
        </p>
        <p>
          Authorization-Header: denselben Wert wie <code className="text-slate-300">SNAPADDY_WEBHOOK_SECRET</code> in Vercel
          (z. B. <code className="text-slate-500">Bearer …</code>).
        </p>
      </CardContent>
    </Card>
  );
}
