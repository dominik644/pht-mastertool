import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DatenschutzMobile } from '../components/DatenschutzMobile';
import { useViewMode } from '../context/ViewModeContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="text-sm text-slate-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export function DatenschutzPage() {
  const { isMobileView } = useViewMode();
  if (isMobileView) return <DatenschutzMobile />;

  const stand = 'Juni 2026';

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-pht-600/20 border border-pht-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-pht-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Datenschutzerklärung</h1>
            <p className="text-slate-400 text-sm mt-0.5">PHT Mastertool (PHT Intelligence) · Stand: {stand}</p>
          </div>
        </div>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-white">Kurzüberblick</h2>
        </CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-2">
          <p>
            Das PHT Mastertool ist eine browserbasierte Anwendung für Ausschreibungsrecherche, Vertriebsworkflow und
            Angebotskalkulation der <strong className="text-white">PHT Group</strong>. Es gibt{' '}
            <strong className="text-white">keine zentrale Mehrbenutzer-Datenbank</strong> auf unseren Servern –
            Ihre Arbeitsdaten verbleiben primär lokal in Ihrem Browser.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-8">
        <Section title="1. Verantwortlicher">
          <p>
            PHT Group<br />
            Website:{' '}
            <a href="https://pht.group" target="_blank" rel="noopener noreferrer" className="text-pht-400 hover:text-pht-300">
              pht.group
            </a>
            <br />
            E-Mail:{' '}
            <a href="mailto:weller@pht.group" className="text-pht-400 hover:text-pht-300">
              weller@pht.group
            </a>
          </p>
        </Section>

        <Section title="2. Lokale Speicherung (localStorage)">
          <p>
            Zur Nutzung der App werden Daten in der <strong className="text-white">localStorage</strong>-Speicherung
            Ihres Browsers abgelegt. Dazu gehören unter anderem:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Ausschreibungs- und Workflow-Daten (Watchlist, Go/No-Go, Historie)</li>
            <li>To-do-Listen, Alert-Regeln und Marktführer-Ziele</li>
            <li>Chat-Verlauf mit SOPHIE (max. 40 Nachrichten)</li>
            <li>Optionale Microsoft-Anmeldeinformationen und Ziel-E-Mail für Integrationen</li>
            <li>Einstellungen zum Angebotsrechner und Digest-Versand</li>
          </ul>
          <p>
            Diese Daten werden <strong className="text-white">nicht</strong> auf einem PHT-Backend für andere Nutzer
            synchronisiert. Sie können sie jederzeit durch Löschen der Browser-Daten für diese Website entfernen.
          </p>
        </Section>

        <Section title="3. SOPHIE – KI-Assistentin (OpenAI)">
          <p>
            Die Assistentin <strong className="text-white">SOPHIE</strong> verarbeitet Ihre Chat-Eingaben über unsere
            Serverless-API (<code className="text-slate-400">/api/assistant</code>). Dort werden Nachrichten und ein
            strukturierter Kontext (z. B. Tender-KPIs, Länder-Abdeckung, Preislisten-Metadaten) an{' '}
            <strong className="text-white">OpenAI</strong> übermittelt, sofern ein API-Schlüssel konfiguriert ist.
          </p>
          <p>
            OpenAI verarbeitet die Anfrage als Auftragsverarbeiter gemäß deren{' '}
            <a
              href="https://openai.com/policies/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pht-400 hover:text-pht-300"
            >
              Datenschutzrichtlinie
            </a>
            . Bitte geben Sie keine unnötigen personenbezogenen Daten Dritter in den Chat ein.
          </p>
          <p>
            Der Chat-Verlauf wird zusätzlich lokal in Ihrem Browser gespeichert (siehe Abschnitt 2).
          </p>
        </Section>

        <Section title="4. Ausschreibungs-APIs (öffentliche Quellen)">
          <p>
            Beim Laden von Ausschreibungen ruft die App öffentliche Vergabeportale und APIs auf (z. B. TED, BBG,
            SIMAP, UK Find a Tender, Prozorro, TenderNed u. a.). Dabei werden Suchbegriffe und technische
            Request-Parameter an diese Dienste übermittelt. Es werden keine personenbezogenen Nutzerprofile an die
            Portale gesendet.
          </p>
        </Section>

        <Section title="5. Microsoft Graph (optional)">
          <p>
            Wenn Sie die optionale <strong className="text-white">Microsoft-Integration</strong> aktivieren (Azure AD /
            MSAL), können Sie Kalendertermine, Outlook-E-Mails und Microsoft-To-Do-Aufgaben aus dem Tool heraus
            anlegen. Dafür ist eine Anmeldung mit Ihrem Microsoft-Konto erforderlich.
          </p>
          <p>
            Tokens und Kontoinformationen werden lokal im Browser (localStorage / MSAL-Cache) gehalten. Die
            Kommunikation erfolgt direkt zwischen Ihrem Browser und den{' '}
            <strong className="text-white">Microsoft Graph</strong>-Diensten. PHT betreibt hierfür keine eigene
            Nutzerdatenbank.
          </p>
          <p>
            Ohne Anmeldung werden keine Microsoft-Daten verarbeitet.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            Das PHT Mastertool setzt <strong className="text-white">keine eigenen Tracking- oder Marketing-Cookies</strong>.
            Technisch notwendige Speicherung erfolgt über localStorage (siehe Abschnitt 2). Beim Hosting auf{' '}
            <strong className="text-white">Vercel</strong> können serverseitig technische Logs (z. B. IP-Adresse,
            Zeitstempel, Request-Pfad) für Betrieb und Sicherheit anfallen.
          </p>
        </Section>

        <Section title="7. Kein Backend mit Mehrbenutzer-Datenbank">
          <p>
            Im Gegensatz zu klassischen SaaS-Anwendungen speichert PHT Mastertool{' '}
            <strong className="text-white">keine zentralen Benutzerkonten oder Tender-Bearbeitungsstände</strong> in
            einer eigenen Datenbank. Serverless-Funktionen dienen ausschließlich dem Proxying öffentlicher APIs und der
            SOPHIE-Anbindung.
          </p>
        </Section>

        <Section title="8. Ihre Rechte">
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung
            personenbezogener Daten, soweit diese bei uns anfallen. Da die meisten Daten lokal in Ihrem Browser
            liegen, können Sie diese dort direkt löschen.
          </p>
          <p>
            Kontakt:{' '}
            <a href="mailto:weller@pht.group" className="text-pht-400 hover:text-pht-300">
              weller@pht.group
            </a>
          </p>
        </Section>

        <Section title="9. Änderungen">
          <p>
            Wir passen diese Erklärung an, wenn sich Funktionen der App ändern. Die aktuelle Fassung finden Sie
            stets unter{' '}
            <Link to="/datenschutz" className="text-pht-400 hover:text-pht-300">
              /datenschutz
            </Link>
            .
          </p>
        </Section>
      </div>

      <p className="mt-10 text-xs text-slate-600">
        <Link to="/" className="text-pht-400 hover:text-pht-300">← Zurück zum Dashboard</Link>
      </p>
    </div>
  );
}
