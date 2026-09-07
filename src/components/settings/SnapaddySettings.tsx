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
          Im Tool:{' '}
          <Link to="/priorities" className="text-pht-400 hover:text-pht-300">Tourenplanung</Link>
          {' '}— ganz oben die Box „Snapaddy Visitenkarten“.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-slate-400">
        <p>
          <strong className="text-slate-300">Handy:</strong> Nach dem Foto Export{' '}
          <strong className="text-slate-300">snapAddy API</strong> wählen — nicht „CRM“, nicht „Kontakt teilen“,
          nicht Microsoft. „CRM“ geht nur an Salesforce/Dynamics u. ä., nicht an unser Tool.
        </p>
        <p>
          Wenn „snapAddy API“ in der App nicht erscheint: In Snapaddy <strong className="text-slate-300">Excel</strong>
          oder vCard teilen und in der Tourenplanung hochladen.
        </p>
        <p>
          Snapaddy-Einrichtung (PC): Einstellungen → Systemintegration → snapAddy API.
          Methode <strong className="text-slate-300">POST</strong> (nicht GET), URL{' '}
          <code className="text-pht-300 break-all">{url}</code>,
          Header <code className="text-slate-300">Authorization: Bearer …</code>
          (gleicher Wert wie <code className="text-slate-300">SNAPADDY_WEBHOOK_SECRET</code>).
          Wenn der Header nicht ankommt: denselben Schlüssel als <code className="text-slate-300">?token=…</code> an die URL hängen.
        </p>
      </CardContent>
    </Card>
  );
}
