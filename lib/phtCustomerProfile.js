/**
 * PHT Ideal Customer Profile – abgeleitet aus 391+ Excel-Kunden (Dominik Weller).
 * Ausrüstung & Anlagen (Wasch-/Hygiene-/Schleusen-Technik) für Lebensmittelproduktion.
 * Vollständige Lebensmittelbranche inkl. Verpackung, Insekten, Convenience, Pet Food, etc.
 */

/** @typedef {{ id: string, label: string, kw: RegExp, meat?: boolean, growth?: boolean, priorityA?: boolean }} SectorRule */

/** Wachstumsbranchen mit Priorität A (Nutzer-Vorgabe). */
export const PRIORITY_A_SECTORS = [
  'convenience', 'vegan', 'bio', 'insects', 'pharma', 'babyfood', 'plant_based',
];

export const PHT_CUSTOMER_PROFILE = {
  version: '2026-07-06-v2',
  owner: 'Dominik Weller',
  region: 'AT / DACH / EU',
  focus: 'equipment-only',
  strategy:
    'Industrielle Wasch-/Hygiene-/Schleusen-Anlagen für die gesamte Lebensmittelproduktion: Convenience, TK, Bio, Vegan, Insekten/Alternative Protein, Verpackung für Lebensmittelbetriebe, Getränke, Molkerei, Bäckerei, Süßwaren, Pet Food, Nutraceuticals. Fleisch primär depriorisiert (C). Reine Dienstleister/Handel ausgeschlossen.',
  derivedFrom: {
    excelCustomers: 391,
    analysisDate: '2026-07-06',
    sectorDistribution: {
      food: 266, meat: 50, dairy: 31, bakery: 19, beverage: 10,
      vegan: 6, bio: 6, convenience: 5, logistics: 5, ingredients: 4,
      babyfood: 2, packaging: 0, insects: 0, confectionery: 0, petfood: 0,
      seafood: 0, coffee_tea: 0, pharma: 0,
    },
    countryDistribution: { AT: 390, DE: 10, OTHER: 2, HU: 1, CZ: 1 },
    priorityDistribution: { A: 32, B: 100, C: 272 },
    meatDeprioritized: true,
  },
  targetIndustries: [
    { id: 'convenience', label: 'Fertiggerichte / Convenience / TK / Tiefkühl', priority: 'A', rationale: 'Hoher Hygienebedarf, CIP, Schleusen, Waschanlagen' },
    { id: 'vegan', label: 'Vegan / Pflanzlich / Plant-Based', priority: 'A', rationale: 'Wachstumssegment, neue Produktionslinien' },
    { id: 'plant_based', label: 'Alternative Protein / Myzel / Fermentation', priority: 'A', rationale: 'Skalierung neuer Proteine, Hygiene bei Fermentation' },
    { id: 'insects', label: 'Insektenfarmen / Käfer / Insektenprotein', priority: 'A', rationale: 'Emerging Food Tech, strenge Hygiene, GMP-Nähe' },
    { id: 'bio', label: 'Bio / Organic / Demeter', priority: 'A', rationale: 'Premium-Hygiene, kleinere Chargen, häufige Reinigung' },
    { id: 'babyfood', label: 'Babynahrung / Säuglingsnahrung', priority: 'A', rationale: 'GMP-ähnliche Hygieneanforderungen' },
    { id: 'pharma', label: 'Pharma / Nutraceutical / Functional Food', priority: 'A', rationale: 'Reinraum-Nähe, Desinfektion' },
    { id: 'packaging', label: 'Verpackung für Lebensmittel (Folie, Tray, MAP, Maschinen)', priority: 'B', rationale: 'Lebensmittelkontakt, Reinraum-Verpackung, MAP/Tray-Linien' },
    { id: 'dairy', label: 'Molkerei / Milch / Käse / Joghurt', priority: 'B', rationale: 'Kernkompetenz PHT, CIP, Behälterreinigung' },
    { id: 'bakery', label: 'Industrielle Bäckerei / Backwaren / Konditorei', priority: 'B', rationale: 'Großbäckereien, Zentrallager, Schimmelhygiene' },
    { id: 'confectionery', label: 'Süßwaren / Schokolade / Konditorei industriell', priority: 'B', rationale: 'Temperierung, Formenreinigung, Allergen-Management' },
    { id: 'beverage', label: 'Getränke / Saft / Brauerei / Wasser', priority: 'B', rationale: 'Abfüllung, CIP, Flaschen-/Fassreinigung' },
    { id: 'coffee_tea', label: 'Kaffee / Tee / Rösterei', priority: 'B', rationale: 'Röstung, Mahlung, Abfüllung, Aromahygiene' },
    { id: 'ingredients', label: 'Zutaten / Aromen / Stärke / Gewürze', priority: 'B', rationale: 'Industrielle Verarbeitung, Behälterwasch' },
    { id: 'oils_fats', label: 'Öle / Fette / Margarine / Aufstriche', priority: 'B', rationale: 'Raffination, Abfüllung, Tankreinigung' },
    { id: 'fruit_veg', label: 'Obst / Gemüse / Salate / Frischverarbeitung', priority: 'B', rationale: 'Waschanlagen, Schneiderei, Kühlketten-Hygiene' },
    { id: 'seafood', label: 'Fisch / Meeresfrüchte / Aquakultur', priority: 'B', rationale: 'Kühlkette, Filetierung, Räucherei' },
    { id: 'pasta', label: 'Teigwaren / Nudeln / Pasta', priority: 'B', rationale: 'Extrusion, Trocknung, Mehlschleusen' },
    { id: 'sauces', label: 'Saucen / Dressings / Würzmittel', priority: 'B', rationale: 'Kochkessel, Abfüllung, CIP' },
    { id: 'snacks', label: 'Snacks / Chips / Knabbereien', priority: 'B', rationale: 'Frittierung, Würzen, Abfüllung' },
    { id: 'petfood', label: 'Tiernahrung / Pet Food', priority: 'B', rationale: 'Extrusion, Dosenabfüllung, Hygiene wie LM' },
    { id: 'frozen', label: 'Tiefkühl / Frozen Food', priority: 'A', rationale: 'TK-Linien, IQF, Schockfrosten' },
    { id: 'food', label: 'Lebensmittel / Sonstige', priority: 'B', rationale: 'Fallback – manuelle Prüfung' },
    { id: 'logistics', label: 'Logistik / Kühlhaus (mit Produktion)', priority: 'C', rationale: 'Nur mit eigener Verarbeitung relevant' },
    { id: 'meat', label: 'Fleisch / Wurst / Schlachtung', priority: 'C', rationale: 'Depriorisiert – nur bei Convenience-Anteil prüfen' },
  ],
  excludePatterns: [
    { pattern: 'pure-meat-primary', description: 'Reine Fleisch-/Wurst-/Schlachtbetriebe ohne Convenience-Anteil → Priorität C' },
    { pattern: 'pure-services', description: 'Reine Dienstleister: Reinigung, Beratung, Handel ohne Produktion' },
    { pattern: 'retail-only', description: 'Reiner LEH/Einzelhandel ohne eigene Produktion' },
    { pattern: 'logistics-only', description: 'Reine Spedition ohne Produktionsstätte' },
    { pattern: 'packaging-no-food', description: 'Verpackung ohne Lebensmittelkontakt (z.B. Industrieverpackung)' },
  ],
  deprioritizeSectors: ['meat'],
  growthSectors: [
    'convenience', 'vegan', 'bio', 'insects', 'plant_based', 'frozen',
    'dairy', 'bakery', 'pharma', 'babyfood', 'beverage', 'packaging',
  ],
};

/** @type {SectorRule[]} – Reihenfolge: spezifisch vor allgemein */
export const SECTOR_RULES = [
  { id: 'insects', label: 'Insekten / Alternative Protein', kw: /insekt|insect|käfer|kaefer|mealworm|mehlwurm|grillen|cricket|larven|entomo|bug.?farm|breeding|bsf|black.?soldier|hermetia|tebrio|protix|ynsect|essento|snack.?insect/i, growth: true, priorityA: true },
  { id: 'plant_based', label: 'Alternative Protein / Fermentation', kw: /myzel|mycel|ferment|precision.?ferm|cell.?based|cultivated|lab.?grown|bioreactor|perfect.?day|formo|root.?foods|geltor|every.?company|bel.?group.?plant/i, growth: true, priorityA: true },
  { id: 'vegan', label: 'Vegan / Pflanzlich', kw: /vegan|pflanz|plant.?based|soja|tofu|seitan|veggie|beyond.?meat|impossible|like.?meat|planted|garden.?gourmet|vivera|quorn|oatly|alpro|not.?co/i, growth: true, priorityA: true },
  { id: 'bio', label: 'Bio / Organic', kw: /\bbio\b|organic|öko|oeko|demeter|naturland|rapunzel|alnatura|bioland|biokreis|soil.?association/i, growth: true, priorityA: true },
  { id: 'convenience', label: 'Convenience / Fertiggerichte', kw: /convenience|fertiggericht|fertig.?gericht|ready.?meal|menü|menu|aufstrich|suppe|eintopf|ragout|lasagne|pizza(?!.?ofen)|snack.?box/i, growth: true, priorityA: true },
  { id: 'frozen', label: 'Tiefkühl / TK / Frozen', kw: /tiefkühl|tiefkuehl|tiefkühl|tk-|frozen|iglo|frosta|iqf|schockfro|eisbär|eisbaer|frigoscandia/i, growth: true, priorityA: true },
  { id: 'packaging', label: 'Verpackung Lebensmittel', kw: /verpack|packaging|folie|tray|map\b|vakuum|schalen|becher|doypack|flow.?pack|abfüllmasch|abfuellmasch|multivac|ulma|robur|sealed.?air|cryovac|g.?mondini|bossar|rovex|snack.?pack/i, growth: true },
  { id: 'meat', label: 'Fleisch / Wurst', kw: /fleisch|wurst|schlacht|metzg|salami|schinken|geflügel|gefluegel|hähnchen|haehnchen|huehner|hühner|beef|pork|butcher|reznictv|landhendl|hendl|pute|puten|wiesenhof|tönnies|toennies|westfleisch|schweine|kalbfleisch|wildbearbeitung/i, meat: true },
  { id: 'babyfood', label: 'Babynahrung', kw: /hipp|babynahrung|infant|kindernahrung|milupa|humana|bebivita|aptamil|bimbosan|holle|leben.?natur|löffler|loeffler.?baby/i, growth: true, priorityA: true },
  { id: 'pharma', label: 'Pharma / Nutraceutical', kw: /pharma|arznei|nutra|lactoferrin|supplement|vitamin|nutraceutical|functional.?food|probiot|orthomol|doppelherz|weleda.?food|bionorica/i, growth: true, priorityA: true },
  { id: 'petfood', label: 'Tiernahrung / Pet Food', kw: /pet.?food|tiernahrung|hundenahrung|katzenfutter|hundefutter|josera|joschi|deuerer|royal.?canin|hills.?pet|affinity|sanabelle|animonda|bosch.?tiernahrung|mera|cat.?clean/i },
  { id: 'dairy', label: 'Molkerei / Milch', kw: /molk|milch|käse|kaese|cheese|joghurt|yogurt|dairy|frischdienst|quark|butter|sahne|kefir|skyr|ricotta|mozzarella|frischkäse|frischkaese/i, growth: true },
  { id: 'bakery', label: 'Bäckerei / Backwaren', kw: /bäck|baeck|backware|bread|brot|backmittel|backprofi|ölz|oelz|kornspitz|backstube|toast|croissant|baguette|knäcke|knaecke/i, growth: true },
  { id: 'confectionery', label: 'Süßwaren / Schokolade', kw: /schoko|chocolat|süßwaren|suesswaren|bonbon|praline|kaugummi|gummibärchen|gummibaerchen|haribo|ferrero|lindt|stollwerck|katjes|bahlsen|lambertz|hachez|reber|confiserie|kondit(?!orei)/i, growth: true },
  { id: 'beverage', label: 'Getränke / Saft', kw: /getränk|getraenk|saft|juice|brauerei|brewery|mineral|fruchtsaft|cola|limonade|bier|energy|soft.?drink|wasserabfüll|wasserabfuell|eistee|kombucha/i, growth: true },
  { id: 'coffee_tea', label: 'Kaffee / Tee', kw: /kaffee|coffee|röst|roest|espresso|tee\b|tea\b|matcha|dallmayr|tchibo|melitta|jacobs|lavazza|illy|teekanne|messmer/i },
  { id: 'seafood', label: 'Fisch / Meeresfrüchte', kw: /fisch|fish|lachs|salmon|forelle|hering|thunfisch|shrimp|garnele|meeresfrüchte|meeresfruechte|aquakultur|aquaculture|räucher|raucher|filetier/i },
  { id: 'fruit_veg', label: 'Obst / Gemüse / Salate', kw: /obst|gemüse|gemuese|salat|frischverarbeit|frisch.?schnitt|schnitt.?salat|apfel|karotte|kartoffel|pflanzliche|tiefkühl.?gemüse|tiefkuehl.?gemuese|del.?monte|bonduelle/i },
  { id: 'oils_fats', label: 'Öle / Fette', kw: /öl\b|oel\b|ölmühle|oelmuehle|margarine|pflanzenfett|rapsöl|rapsoel|olivenöl|olivenoel|sonnenblum|frittier|spread|aufstrich(?!.*vegan)/i },
  { id: 'pasta', label: 'Teigwaren / Nudeln', kw: /pasta|nudel|teigware|spaghetti|penne|maccaroni|barilla|buitoni|ebly|couscous|gnocchi/i },
  { id: 'sauces', label: 'Saucen / Dressings', kw: /sauce|soße|sose|dressing|ketchup|mayonnaise|senf|würzmittel|wuerzmittel|remoulade|pesto|ragù|ragu/i },
  { id: 'snacks', label: 'Snacks / Chips', kw: /snack|chips|knabber|popcorn|pretzel|brezel|crisp|cräcker|craecker|lorenz|intersnack|bahlsen.?snack|ültje|ueltje/i },
  { id: 'ingredients', label: 'Zutaten / Aromen', kw: /aroma|esarom|gewürz|gewuerz|ingredient|extrakt|stärke|starke|zucker|mühle|muehle|hefe|backhefe|gelatine|lecithin|emulgator|stabilisator|süßstoff|suessstoff/i },
  { id: 'logistics', label: 'Logistik / Transport', kw: /logistik|transport|spedition|cargo|welttransport|lager(?!ung)/i },
];

const LEGAL_SUFFIXES =
  /\b(gmbh|gmbh\s*&\s*co\.?\s*kg|ag|eg|e\.?g\.?|gen|eigen|og|kg|co\.?\s*kg|mbh|ges\.?\s*m\.?\s*b\.?\s*h\.?|gesellschaft|holding|gruppe|group|austria|österreich|oesterreich|deutschland|schweiz|international|produktion|produktions|werk|standort|niederlassung|zweigniederlassung|sa|s\.a\.|sarl|bv|nv|ltd|inc)\b/gi;

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
  if (sector.id === 'vegan' || sector.id === 'bio' || sector.id === 'convenience' || sector.id === 'insects' || sector.id === 'plant_based' || sector.id === 'frozen') score += 15;
  if (sector.id === 'pharma' || sector.id === 'babyfood') score += 10;
  if (sector.id === 'packaging') score += 8;
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
  const priorityASectors = ['vegan', 'bio', 'convenience', 'pharma', 'babyfood', 'insects', 'plant_based', 'frozen'];
  if (
    sector.growth &&
    priorityASectors.includes(sector.id)
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
