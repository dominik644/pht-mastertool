/**
 * PHT Ideal Customer Profile – abgeleitet aus 391+ Excel-Kunden (Dominik Weller).
 * Ausrüstung & Anlagen (Wasch-/Hygiene-/Schleusen-Technik) für Lebensmittelproduktion.
 */

/** @typedef {{ id: string, label: string, kw: RegExp, meat?: boolean, growth?: boolean, priorityA?: boolean }} SectorRule */

/** Wachstumsbranchen mit Priorität A (Nutzer-Vorgabe). */
export const PRIORITY_A_SECTORS = ['convenience', 'vegan', 'bio', 'convenience', 'pharma'];

export const PHT_CUSTOMER_PROFILE = {
  version: '2026-07-06',
  owner: 'Dominik Weller',
  region: 'AT / DACH',
  focus: 'equipment-only',
  strategy:
    'Industrielle Wasch-/Hygiene-/Schleusen-Anlagen für Lebensmittel-, Convenience-, Bio-, Vegan- und Pharma-Nahrungsmittelproduktion. Fleisch primär depriorisiert. Reine Dienstleister/Handel ausgeschlossen.',
  derivedFrom: {
    excelCustomers: 391,
    analysisDate: '2026-07-06',
    sectorDistribution: {
      food: 266,
      meat: 50,
      dairy: 31,
      bakery: 19,
      beverage: 10,
      vegan: 6,
      bio: 6,
      convenience: 5,
      logistics: 5,
      ingredients: 4,
      babyfood: 2,
      pharma: 0,
    },
    countryDistribution: { AT: 390, DE: 10, OTHER: 2, HU: 1, CZ: 1 },
    priorityDistribution: { A: 32, B: 100, C: 272 },
    meatDeprioritized: true,
  },
  targetIndustries: [
    { id: 'convenience', label: 'Fertiggerichte / Convenience / TK', priority: 'A', rationale: 'Hoher Hygienebedarf, CIP, Schleusen, Waschanlagen' },
    { id: 'vegan', label: 'Vegan / Pflanzlich', priority: 'A', rationale: 'Wachstumssegment, neue Produktionslinien' },
    { id: 'bio', label: 'Bio / Organic', priority: 'A', rationale: 'Premium-Hygiene, kleinere Chargen, häufige Reinigung' },
    { id: 'dairy', label: 'Molkerei / Milch / Käse', priority: 'B', rationale: 'Kernkompetenz PHT, CIP, Behälterreinigung' },
    { id: 'bakery', label: 'Industrielle Bäckerei / Backwaren', priority: 'B', rationale: 'Großbäckereien, Zentrallager, Schimmelhygiene' },
    { id: 'beverage', label: 'Getränke / Saft / Brauerei', priority: 'B', rationale: 'Abfüllung, CIP, Flaschen-/Fassreinigung' },
    { id: 'babyfood', label: 'Babynahrung / Säuglingsnahrung', priority: 'A', rationale: 'GMP-ähnliche Hygieneanforderungen' },
    { id: 'pharma', label: 'Pharma / Nutraceutical (food-adjacent)', priority: 'A', rationale: 'Reinraum-Nähe, Desinfektion' },
    { id: 'ingredients', label: 'Zutaten / Aromen / Stärke', priority: 'B', rationale: 'Industrielle Verarbeitung, Behälterwasch' },
    { id: 'food', label: 'Lebensmittel / Sonstige', priority: 'B', rationale: 'Fallback – manuelle Prüfung' },
  ],
  excludePatterns: [
    { pattern: 'pure-meat-primary', description: 'Reine Fleisch-/Wurst-/Schlachtbetriebe ohne Convenience-Anteil → Priorität C' },
    { pattern: 'pure-services', description: 'Reine Dienstleister: Reinigung, Beratung, Handel ohne Produktion' },
    { pattern: 'retail-only', description: 'Reiner LEH/Einzelhandel ohne eigene Produktion' },
    { pattern: 'logistics-only', description: 'Reine Spedition ohne Produktionsstätte' },
  ],
  deprioritizeSectors: ['meat'],
  growthSectors: ['convenience', 'vegan', 'bio', 'dairy', 'bakery', 'pharma', 'babyfood', 'beverage'],
};

/** @type {SectorRule[]} */
export const SECTOR_RULES = [
  { id: 'meat', label: 'Fleisch / Wurst', kw: /fleisch|wurst|schlacht|metzg|salami|schinken|geflügel|gefluegel|hähnchen|haehnchen|huehner|hühner|beef|pork|butcher|reznictv|landhendl|hendl|pute|puten|wiesenhof|tönnies|toennies|westfleisch/i, meat: true },
  { id: 'vegan', label: 'Vegan / Pflanzlich', kw: /vegan|pflanz|plant.?based|soja|tofu|seitan|veggie|myzel|alt.?protein/i, growth: true, priorityA: true },
  { id: 'bio', label: 'Bio / Organic', kw: /\bbio\b|organic|öko|oeko|demeter|naturland|rapunzel|alnatura/i, growth: true, priorityA: true },
  { id: 'convenience', label: 'Convenience / TK', kw: /convenience|fertiggericht|tiefkühl|tiefkuehl|tiefkühl|tk-|frozen|iglo|frosta|snack|fingerfood|ready.?meal|pizza|menü|menu/i, growth: true, priorityA: true },
  { id: 'dairy', label: 'Molkerei / Milch', kw: /molk|milch|käse|kaese|cheese|joghurt|yogurt|dairy|frischdienst|quark|butter|sahne/i, growth: true },
  { id: 'bakery', label: 'Bäckerei / Backwaren', kw: /bäck|baeck|backware|kondit|gebäck|gebaeck|bread|brot|backmittel|backprofi|ölz|oelz/i, growth: true },
  { id: 'pharma', label: 'Pharma / Nutraceutical', kw: /pharma|arznei|nutra|lactoferrin|supplement|vitamin|nutraceutical/i, growth: true, priorityA: true },
  { id: 'logistics', label: 'Logistik / Transport', kw: /logistik|transport|spedition|cargo|welttransport|lager(?!ung)/i },
  { id: 'beverage', label: 'Getränke / Saft', kw: /getränk|getraenk|saft|juice|brauerei|brewery|mineral|fruchtsaft|cola|limonade|bier|energy/i, growth: true },
  { id: 'ingredients', label: 'Zutaten / Aromen', kw: /aroma|esarom|gewürz|gewuerz|ingredient|extrakt|stärke|starke|zucker|mühle|muehle/i },
  { id: 'babyfood', label: 'Babynahrung', kw: /hipp|babynahrung|infant|kindernahrung|milupa|humana|bebivita|aptamil/i, growth: true, priorityA: true },
];

const LEGAL_SUFFIXES =
  /\b(gmbh|gmbh\s*&\s*co\.?\s*kg|ag|eg|e\.?g\.?|gen|eigen|og|kg|co\.?\s*kg|mbh|ges\.?\s*m\.?\s*b\.?\s*h\.?|gesellschaft|holding|gruppe|group|austria|österreich|oesterreich|deutschland|schweiz|international|produktion|produktions|werk|standort|niederlassung|zweigniederlassung)\b/gi;

/**
 * Normalize company name for fuzzy deduplication.
 * @param {string} name
 */
export function normalizeCustomerName(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' und ')
    .replace(LEGAL_SUFFIXES, ' ')
    .replace(/[^a-z0-9äöüß ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {string} name */
export function nameTokens(name) {
  const n = normalizeCustomerName(name);
  return n.split(' ').filter((t) => t.length > 2);
}

/**
 * @param {string} a
 * @param {string} b
 */
export function namesAreSimilar(a, b) {
  const na = normalizeCustomerName(a);
  const nb = normalizeCustomerName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (ta.size === 0 || tb.size === 0) return false;

  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  const minSize = Math.min(ta.size, tb.size);
  return overlap >= 2 || (minSize <= 2 && overlap >= 1 && overlap === minSize);
}

/**
 * @param {{ name: string, matchKey?: string }} lead
 * @param {Array<{ name: string }>} existing
 */
export function isDuplicateLead(lead, existing) {
  const keys = [lead.matchKey, lead.name].filter(Boolean).map((k) => normalizeCustomerName(k));
  for (const ex of existing) {
    for (const key of keys) {
      if (namesAreSimilar(key, ex.name)) return true;
      const nk = normalizeCustomerName(ex.name);
      if (key && nk.includes(key)) return true;
      if (key && key.includes(nk) && nk.length > 8) return true;
    }
  }
  return false;
}

/** @param {string} name */
export function classifySector(name) {
  const n = name.toLowerCase();
  for (const rule of SECTOR_RULES) {
    if (rule.kw.test(n)) return rule;
  }
  return { id: 'food', label: 'Lebensmittel / Sonstige', meat: false, growth: false };
}

/**
 * @param {{ sector: SectorRule, excelScore?: number, status?: object, exchangeHints?: string[], country?: string, isMeat?: boolean, potentialScore?: number }} p
 */
export function computePotentialScore({ sector, excelScore = 10, status = {}, exchangeHints = [], country, isMeat, potentialScore }) {
  if (potentialScore != null) return Math.max(0, Math.min(100, Math.round(potentialScore)));

  let score = Number(excelScore) || 10;
  if (sector.growth) score += 25;
  if (sector.id === 'vegan' || sector.id === 'bio' || sector.id === 'convenience') score += 15;
  if (sector.id === 'pharma' || sector.id === 'babyfood') score += 10;
  if (isMeat) score -= 35;
  if (status.urgent) score += 12;
  if (status.formerA) score += 8;
  if (status.active) score += 5;
  if (status.inactive) score += 3;
  if (exchangeHints.length > 0) score += exchangeHints.length * 4;
  if (country === 'AT') score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * @param {{ sector: SectorRule, isMeat?: boolean, potentialScore: number, excelAbc?: string, status?: object }} p
 */
export function assignPriority({ sector, isMeat, potentialScore, excelAbc, status = {} }) {
  if (isMeat) return 'C';
  if (
    sector.growth &&
    (sector.id === 'vegan' || sector.id === 'bio' || sector.id === 'convenience' || sector.id === 'pharma' || sector.id === 'babyfood')
  ) {
    if (potentialScore >= 45) return 'A';
  }
  if (sector.growth && potentialScore >= 55) return 'A';
  if (excelAbc === 'A' && !isMeat && potentialScore >= 40) return 'A';
  if (excelAbc === 'B' || potentialScore >= 35) return 'B';
  return 'C';
}

export function cadenceMonths(priority) {
  if (priority === 'A') return 6;
  if (priority === 'B') return 12;
  return 18;
}
