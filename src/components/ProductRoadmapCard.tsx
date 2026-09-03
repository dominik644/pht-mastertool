import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/Card';

const ROADMAP = [
  {
    phase: 'Phase 1 – Vertriebs-UI',
    status: 'live' as const,
    items: [
      'Command Center: Fokus Mein Tag / Tourenplanung',
      'Navigation: Tourenplanung prominent, Ausschreibungen im Hintergrund',
    ],
  },
  {
    phase: 'Phase 2 – Territorium & Discovery',
    status: 'live' as const,
    items: [
      'DACH + SEE Branchenprofil (Hygiene-Lebensmittel)',
      'Tägliche Kunden-Discovery (GitHub Action)',
      'Kontakt-Enrichment wöchentlich (E-Mail/Telefon aus öffentlichen Quellen)',
    ],
  },
  {
    phase: 'Phase 3 – Lern-Gehirn',
    status: 'live' as const,
    items: [
      'Daumen hoch/runter & „War relevant?" nach Besuch',
      'Gewichtetes Scoring in localStorage (pht-sales-feedback)',
      'Geplant: echtes ML-Modell aus Feedback-Export',
    ],
  },
  {
    phase: 'Phase 4 – Business Central',
    status: 'live' as const,
    items: [
      'READ-ONLY: KV, Rechnungen & Konditionsvereinbarungen pro Kunde',
      'Keine Schreibzugriffe auf Production-ERP (Code + Azure Scope)',
    ],
  },
  {
    phase: 'Phase 5 – E-Mail-Outreach',
    status: 'live' as const,
    items: [
      'E-Mail kopieren, Outlook mailto mit Vorlage',
      'CSV-Export für Mail-Merge (kein Auto-Spam)',
    ],
  },
  {
    phase: 'Geplant',
    status: 'planned' as const,
    items: [
      'Vollautomatisches ML-Scoring aus Besuchs- & Pipeline-Daten',
      'Tiefere Web-Recherche DACH+SEE (mehr Quellen)',
      'Ausschreibungen nur noch als Hintergrund-Signal',
    ],
  },
];

export function ProductRoadmapCard() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pht-400" />
          Produkt-Roadmap (Tourenplanung)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Was live ist vs. geplant – Stand September 2026
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {ROADMAP.map(({ phase, status, items }) => (
          <div key={phase}>
            <div className="flex items-center gap-2 mb-1.5">
              {status === 'live' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <p className="text-xs font-medium text-slate-300">{phase}</p>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  status === 'live'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-slate-700 text-slate-500'
                }`}
              >
                {status === 'live' ? 'Live' : 'Geplant'}
              </span>
            </div>
            <ul className="ml-5 space-y-0.5">
              {items.map((item) => (
                <li key={item} className="text-xs text-slate-500 list-disc">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
