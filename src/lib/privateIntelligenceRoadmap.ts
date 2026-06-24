/** Roadmap Private Bauchancen – UI-Status (Tool vs. Abo vs. Vertrieb). */

export type RoadmapStatus = 'live' | 'beta' | 'planned';

export interface PrivateIntelligenceRoadmapItem {
  id: string;
  label: string;
  status: RoadmapStatus;
  effort: 'S' | 'M' | 'L';
  cost: string;
  tier: 'tool' | 'abo' | 'vertrieb';
  /** Tooltip – z. B. „Abo erforderlich“ bei Paywall-Quellen */
  note?: string;
}

export const PRIVATE_INTELLIGENCE_ROADMAP: PrivateIntelligenceRoadmapItem[] = [
  { id: 'news-google', label: 'Google News Expansion-Queries', status: 'live', effort: 'S', cost: 'kostenlos', tier: 'tool' },
  { id: 'news-rss', label: 'Konzernpresse & Branchen-RSS (50+ Quellen)', status: 'live', effort: 'S', cost: 'kostenlos', tier: 'tool' },
  { id: 'news-watchlist', label: 'FMCG-Unternehmens-Watchlist (80+ Marken)', status: 'live', effort: 'S', cost: 'kostenlos', tier: 'tool' },
  { id: 'news-linkedin-gn', label: 'LinkedIn-Signale via Google News', status: 'live', effort: 'S', cost: 'kostenlos', tier: 'tool' },
  { id: 'bauvorhaben-gn', label: 'Baugenehmigungen via News-Aggregation', status: 'beta', effort: 'M', cost: 'kostenlos', tier: 'tool' },
  { id: 'bauvorhaben-standortportal', label: 'Standortportale Bayern / NRW / IHK-Flächen', status: 'beta', effort: 'M', cost: 'kostenlos (Google News)', tier: 'tool' },
  { id: 'env-permits', label: 'Immissionsschutz / TA Luft / Wasserrecht (Behördenregister)', status: 'beta', effort: 'L', cost: 'kostenlos (Google News)', tier: 'tool' },
  { id: 'job-postings', label: 'Stellenanzeigen (Indeed/StepStone: Plant Manager, Greenfield)', status: 'beta', effort: 'M', cost: 'kostenlos (Google News)', tier: 'tool' },
  { id: 'supplier-reverse', label: 'Reverse Intelligence: Multivac/Krones/GEA Auftrags-News', status: 'beta', effort: 'S', cost: 'kostenlos', tier: 'tool' },
  { id: 'planning-uk-odp', label: 'Planning Applications UK (planning.data.gov.uk)', status: 'beta', effort: 'M', cost: 'kostenlos', tier: 'tool' },
  { id: 'planning-apps-intl', label: 'Planning Applications US (ConstructConnect) / Glenigan Premium', status: 'planned', effort: 'M', cost: '€€€ Abo', tier: 'tool', note: 'Abo erforderlich – Glenigan/ConstructConnect ohne öffentliche API' },
  { id: 'utility-connections', label: 'Netzanschluss-Signale (Strom/Gas Großanschluss)', status: 'beta', effort: 'L', cost: 'kostenlos (Google News)', tier: 'tool' },
  { id: 'isb-documedia', label: 'ISB / Documedia / BCI Bau-Datenbank', status: 'planned', effort: 'L', cost: '€€€ Abo', tier: 'abo', note: 'Abo erforderlich – ISB/Documedia/BCI sind kostenpflichtige Bau-Datenbanken' },
  { id: 'intl-construction-db', label: 'Dodge Data / Glenigan / Reed Construction (CA)', status: 'planned', effort: 'L', cost: '€€€ Abo', tier: 'abo', note: 'Abo erforderlich – internationale Bau-Datenbanken ohne freien Feed' },
  { id: 'linkedin-nav', label: 'LinkedIn Sales Navigator Alerts', status: 'planned', effort: 'M', cost: '€€/Nutzer/Monat', tier: 'abo', note: 'Abo erforderlich – Sales Navigator Lizenz pro Nutzer' },
  { id: 'finanz-capex', label: 'CapEx-Signale: Jahresberichte, Bond Prospectus, Earnings Calls', status: 'beta', effort: 'M', cost: 'kostenlos (Google News)', tier: 'abo' },
  { id: 'foerder-bei-kfw', label: 'BEI / KfW / EFRE-Projektlisten (Förderentscheidungen)', status: 'beta', effort: 'M', cost: 'kostenlos', tier: 'abo' },
  { id: 'gu-crm', label: 'GU-Netzwerk & Projekt-CRM', status: 'planned', effort: 'L', cost: 'Vertriebszeit', tier: 'vertrieb' },
  { id: 'messen', label: 'Messen (Anuga, IFFA, LogiMAT) & Referenzen', status: 'planned', effort: 'L', cost: 'Vertriebszeit', tier: 'vertrieb' },
  { id: 'planer-netzwerk', label: 'Planer-Netzwerk (ATP, N+P, Food-Architekten)', status: 'planned', effort: 'L', cost: 'Vertriebszeit', tier: 'vertrieb' },
  { id: 'sub-ausschreibungen', label: 'Sub-GU-Ausschreibungen (Hygiene-Gewerke im LV)', status: 'beta', effort: 'M', cost: 'kostenlos (News + Tender-Scan)', tier: 'vertrieb' },
  { id: 'community-opposition', label: 'Bürgerinitiativen / Einsprüche = Projekt existiert', status: 'beta', effort: 'S', cost: 'kostenlos (Google News)', tier: 'tool' },
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
