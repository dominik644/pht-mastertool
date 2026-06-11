import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from './ui/Card';

function Section({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
        <span className="text-sm font-semibold text-white flex-1">{title}</span>
        <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="mt-2 px-1 text-sm text-slate-300 leading-relaxed space-y-3 pb-2">{children}</div>
    </details>
  );
}

export function DatenschutzMobile() {
  const stand = 'Juni 2026';

  return (
    <div className="p-4 space-y-4">
      <header>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-pht-600/20 border border-pht-500/30 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-pht-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Datenschutz</h1>
            <p className="text-xs text-slate-500">PHT Intelligence · Stand: {stand}</p>
          </div>
        </div>
      </header>

      <Card>
        <CardContent className="py-4 text-sm text-slate-300 space-y-2">
          <p>
            Browserbasierte App für Ausschreibungsrecherche der <strong className="text-white">PHT Group</strong>.
            Keine zentrale Mehrbenutzer-Datenbank – Daten verbleiben primär lokal im Browser.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Section title="1. Verantwortlicher" defaultOpen>
          <p>
            PHT Group ·{' '}
            <a href="https://pht.group" target="_blank" rel="noopener noreferrer" className="text-pht-400">pht.group</a>
            <br />
            <a href="mailto:weller@pht.group" className="text-pht-400">weller@pht.group</a>
          </p>
        </Section>

        <Section title="2. Lokale Speicherung">
          <p>Daten in <strong className="text-white">localStorage</strong>: Watchlist, Workflow, To-dos, Alert-Regeln, SOPHIE-Chat (max. 40), Microsoft-Tokens.</p>
          <p>Nicht auf PHT-Backend synchronisiert. Löschbar über Browser-Daten.</p>
        </Section>

        <Section title="3. SOPHIE (OpenAI)">
          <p>Chat über Serverless-API an OpenAI, sofern API-Key konfiguriert. Keine unnötigen personenbezogenen Daten eingeben.</p>
        </Section>

        <Section title="4. Ausschreibungs-APIs">
          <p>Öffentliche Vergabeportale (TED, BBG, SIMAP u. a.). Keine Nutzerprofile an Portale.</p>
        </Section>

        <Section title="5. Microsoft Graph">
          <p>Optional: Kalender, E-Mail, To-Do. Tokens lokal im Browser. Ohne Anmeldung keine Microsoft-Daten.</p>
        </Section>

        <Section title="6. Cookies">
          <p>Keine Tracking-Cookies. Technische Speicherung via localStorage. Vercel-Logs für Betrieb möglich.</p>
        </Section>

        <Section title="7. Kein Mehrbenutzer-Backend">
          <p>Keine zentralen Benutzerkonten. Serverless nur für API-Proxy und SOPHIE.</p>
        </Section>

        <Section title="8. Ihre Rechte">
          <p>Auskunft, Berichtigung, Löschung. Kontakt: <a href="mailto:weller@pht.group" className="text-pht-400">weller@pht.group</a></p>
        </Section>

        <Section title="9. Änderungen">
          <p>Aktuelle Fassung unter <Link to="/datenschutz" className="text-pht-400">/datenschutz</Link></p>
        </Section>
      </div>

      <Link to="/" className="block text-center text-sm text-pht-400 min-h-[44px] flex items-center justify-center">
        ← Zurück zum Dashboard
      </Link>
    </div>
  );
}
