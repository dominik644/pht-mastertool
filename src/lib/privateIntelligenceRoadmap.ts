/** Roadmap Private Bauchancen – UI-Status (Tool vs. Abo vs. Vertrieb). */

export type RoadmapStatus = 'live' | 'beta' | 'planned';

export interface PrivateIntelligenceRoadmapItem {
  id: string;
  label: string;
  status: RoadmapStatus;
  effort: 'S' | 'M' | 'L';
  cost: string;
  tier: 'tool' | 'abo' | 'vertrieb';
}

export const PRIVATE_INTELLIGENCE_ROADMAP: PrivateIntelligenceRoadmapItem[] = [
  { id: 'news-google', label: 'Google News Expansion-Queries', status: 'live', effort: 'S', cost: 'kostenlos', tier: 'tool' },
  { id: 'news-rss', label: 'Konzernpresse & Branchen-RSS (50+ Quellen)', status: 'live', effort: 'S', cost: 'kostenlos', tier: 'tool' },
  { id: 'news-watchlist', label: 'FMCG-Unternehmens-Watchlist (80+ Marken)', status: 'live', effort: 'S', cost: 'kostenlos', tier: 'tool' },
  { id: 'news-linkedin-gn', label: 'LinkedIn-Signale via Google News', status: 'live', effort: 'S', cost: 'kostenlos', tier: 'tool' },
  { id: 'bauvorhaben-gn', label: 'Baugenehmigungen via News-Aggregation', status: 'beta', effort: 'M', cost: 'kostenlos', tier: 'tool' },
  { id: 'bauvorhaben-standortportal', label: 'Standortportal Bayern / IHK-Flächen', status: 'planned', effort: 'M', cost: 'kostenlos (manuell)', tier: 'tool' },
  { id: 'isb-documedia', label: 'ISB / Documedia / BCI Bau-Datenbank', status: 'planned', effort: 'L', cost: '€€€ Abo', tier: 'abo' },
  { id: 'linkedin-nav', label: 'LinkedIn Sales Navigator Alerts', status: 'planned', effort: 'M', cost: '€€/Nutzer/Monat', tier: 'abo' },
  { id: 'gu-crm', label: 'GU-Netzwerk & Projekt-CRM', status: 'planned', effort: 'L', cost: 'Vertriebszeit', tier: 'vertrieb' },
  { id: 'messen', label: 'Messen (Anuga, IFFA, LogiMAT) & Referenzen', status: 'planned', effort: 'L', cost: 'Vertriebszeit', tier: 'vertrieb' },
];

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  live: 'Live',
  beta: 'Beta',
  planned: 'Geplant',
};

export const ROADMAP_TIER_LABELS: Record<PrivateIntelligenceRoadmapItem['tier'], string> = {
  tool: 'Sofort im Tool',
  abo: 'Mit Abo/Partner',
  vertrieb: 'Vertrieb/Prozess',
};
