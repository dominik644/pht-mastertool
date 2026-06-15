#!/usr/bin/env node
/**
 * Generate lib/priceListKeywords.js from src/data/priceList2026.json
 * Run: node scripts/generate_price_list_keywords.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const JSON_PATH = join(ROOT, 'src/data/priceList2026.json');
const OUT_PATH = join(ROOT, 'lib/priceListKeywords.js');

const STOP_WORDS = new Set([
  'mit', 'und', 'für', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer',
  'typ', 'modell', 'version', 'inkl', 'ohne', 'sowie', 'bzw', 'ca', 'inklusive', 'integrierter',
  'integrierte', 'integriertes', 'sensorsteuerung', 'trocknung', 'ausführung', 'ausfuehrung',
  'standard', 'optional', 'zubehör', 'zubehoer', 'system', 'anlage', 'gerät', 'geraet',
  'mobile', 'station', 'automat', 'automatisch', 'elektrisch', 'manuell', 'stahl', 'edelstahl',
  'kunststoff', 'polyethylen', 'pe', 'typ', 'serie', 'größe', 'groesse', 'farbe', 'neu', 'alt',
  'tap', 'plus', 'pro', 'max', 'mini', 'set', 'kit', 'teil', 'teile', 'einheit', 'stück', 'stueck',
]);

/** DE hygiene/product terms → EN, FR, IT, NL variants */
const TRANSLATIONS = {
  handreinigungsbecken: ['hand wash basin', 'hand washing station', 'handwasbak', 'lavabo', 'lavaggio mani', 'lavabo mains'],
  handreinigungsrinne: ['hand wash trough', 'hand washing trough', 'handwasbak', 'lavabo collectif'],
  hygienestation: ['hygiene station', 'hygiene gate', 'hygiënestation', 'station hygiène', 'stazione igienica'],
  sohlenreinigung: ['sole cleaning', 'boot sole cleaner', 'semelle', 'suola', 'zoolreiniging'],
  sohlendesinfektion: ['sole disinfection', 'désinfection semelles', 'desinfectie zolen'],
  handdesinfektion: ['hand disinfection', 'hand sanitizer station', 'désinfection mains', 'desinfectie handen'],
  behälterreinigung: ['container cleaning', 'crate washer', 'nettoyage conteneurs', 'pulizia contenitori', 'containerreiniging'],
  behälterreinigungsanlage: ['container washing system', 'crate washing plant', 'myjnia pojemników'],
  waschkabinett: ['wash cabinet', 'washing cabinet', 'cabine de lavage', 'cabina lavaggio'],
  schuhtrocknung: ['shoe drying', 'boot drying', 'séchage chaussures', 'asciugatura scarpe'],
  schuhtrocknungssystem: ['shoe drying system', 'boot dryer system'],
  stiefeltrockner: ['boot dryer', 'boot drier', 'sécheur bottes', 'asciugatore stivali', 'laarzensdroger'],
  stiefelaufbewahrung: ['boot storage', 'boot rack', 'rangement bottes'],
  schürzenreinigung: ['apron cleaning', 'apron washer', 'nettoyage tabliers'],
  messersterilisation: ['knife sterilization', 'knife steriliser', 'stérilisation couteaux'],
  messerkorb: ['knife basket', 'knife rack', 'panier couteaux'],
  bürstenreinigung: ['brush cleaning', 'brush washer', 'nettoyage brosses'],
  palettenreinigung: ['pallet cleaning', 'pallet washer', 'nettoyage palettes'],
  niederdruck: ['low pressure cleaning', 'low-pressure', 'basse pression', 'lagedruk'],
  schaumsreinigung: ['foam cleaning', 'nettoyage mousse', 'schuimreiniging'],
  schaumreinigung: ['foam cleaning', 'foam wash', 'nettoyage mousse', 'schuimreiniging'],
  schäumer: ['foamer', 'foam unit', 'moussoir', 'schuimapparaat'],
  schlauchaufroller: ['hose reel', 'enrouleur tuyau', 'slanghaspel'],
  portaldrehkreuz: ['turnstile', 'portal turnstile', 'tourniquet', 'draaikruis'],
  drehsperre: ['turnstile', 'rotating barrier', 'tourniquet'],
  eingangskontrolle: ['entrance control', 'entry control', 'contrôle entrée', 'ingresso controllo'],
  personenschleuse: ['personnel lock', 'hygiene lock', 'personnel airlock', ' sas personnel'],
  personenwaschanlage: ['personnel washing station', 'staff hygiene station'],
  seifenspender: ['soap dispenser', 'distributeur savon', 'dispenser sapone', 'zeepdispenser'],
  händetrockner: ['hand dryer', 'séchoir mains', 'asciugamani', 'handdroger'],
  abfallsammler: ['waste collector', 'waste bin', 'collecteur déchets', 'afvalbak'],
  trocknungsanlage: ['drying system', 'drying plant', 'séchage', 'asciugatura'],
  reinigungsbedarf: ['cleaning supplies', 'cleaning consumables', 'fournitures nettoyage'],
  bodenablauf: ['floor drain', 'drainage floor', 'siphon de sol'],
  gabelhubwagen: ['pallet truck washer', 'forklift hygiene'],
  pendeltür: ['swing door', 'porte battante'],
  frontlader: ['front loader washer', 'chargeur frontal'],
  'hebe-kippanlage': ['tipper unit', 'dumping station', 'basculement'],
  desinfektionsmatte: ['disinfection mat', 'sanitizing mat', 'tapis désinfection'],
  sterilisationsbecken: ['sterilization bath', 'sterilizing sink'],
  kistenwäsche: ['crate washing', 'box washer', 'lavage caisses'],
  kistenwaesche: ['crate washing', 'box washer'],
  desinfektionsmittel: ['disinfectant', 'désinfectant', 'disinfettante', 'desinfectiemiddel'],
  reinraum: ['clean room', 'salle blanche', 'cleanroom'],
  betriebshygiene: ['operational hygiene', 'industrial hygiene', 'hygiène industrielle'],
};

const PHT_BRANDS = [
  'pht', 'sanicare', 'ewg', 'dzw', 'ekw', 'combi', 'ezd', 'hdt', 'hst', 'hfs', 'ndr', 'san',
];

const HYGIENE_GATE = [
  'hygiene', 'hygien', 'reinigung', 'reinigen', 'cleaning', 'clean', 'wash', 'washing', 'wasch',
  'desinfektion', 'disinfection', 'desinfect', 'sanitation', 'sanitär', 'sanitar', 'sanitary',
  'cip', 'gmp', 'food', 'pharma', 'hospital', 'krankenhaus', 'klinik', 'lebensmittel',
  'industrial', 'production', 'facility', 'betrieb', 'nettoyage', 'hygiène', 'hygiene',
  'reiniging', 'desinfectie', 'higiena', 'dezynfekcja', 'tisztítás', 'limpieza', 'limpeza',
  'steril', 'desinfiz', 'schleuse', 'eingang', 'personnel', 'personal', 'staff',
];

function stripUmlauts(s) {
  return s
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue');
}

function normalizeToken(s) {
  return s.toLowerCase().trim();
}

function variantsFor(term) {
  const base = normalizeToken(term);
  if (!base || base.length < 3) return [];
  const out = new Set([base]);
  const noUmlaut = stripUmlauts(base);
  if (noUmlaut !== base) out.add(noUmlaut);
  if (base.includes('-')) {
    out.add(base.replace(/-/g, ' '));
    out.add(base.replace(/-/g, ''));
  }
  if (base.includes(' ')) {
    out.add(base.replace(/ /g, '-'));
    out.add(base.replace(/ /g, ''));
  }
  if (base.includes('ä') || base.includes('ö') || base.includes('ü') || base.includes('ß')) {
    const nu = stripUmlauts(base);
    if (nu.includes('-')) {
      out.add(nu.replace(/-/g, ' '));
      out.add(nu.replace(/-/g, ''));
    }
  }
  return [...out].filter((v) => v.length >= 3);
}

function tokensFromText(text) {
  const lower = text.toLowerCase();
  const words = lower.match(/[a-zäöüß]{3,}|[a-z]{2}\d+/gi) ?? [];
  return words.map(normalizeToken);
}

function isValidKeyword(kw) {
  if (!kw || kw.length < 3) return false;
  if (STOP_WORDS.has(kw)) return false;
  if (/^\d+$/.test(kw)) return false;
  return true;
}

function addKeyword(set, kw) {
  const k = normalizeToken(kw);
  if (isValidKeyword(k)) set.add(k);
}

function addWithVariants(set, term) {
  for (const v of variantsFor(term)) addKeyword(set, v);
  const trans = TRANSLATIONS[normalizeToken(term)] ?? TRANSLATIONS[stripUmlauts(normalizeToken(term))];
  if (trans) for (const t of trans) for (const v of variantsFor(t)) addKeyword(set, v);
}

const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const allKeywords = new Set();
const strongKeywords = new Set();

for (const brand of PHT_BRANDS) addKeyword(strongKeywords, brand);

for (const cat of data.categories) {
  addWithVariants(allKeywords, cat.name);
  addWithVariants(strongKeywords, cat.name);
  for (const tok of tokensFromText(cat.name)) {
    if (tok.length >= 5) addWithVariants(allKeywords, tok);
  }
}

for (const product of data.products) {
  addWithVariants(allKeywords, product.name);
  addWithVariants(allKeywords, product.category);
  addWithVariants(allKeywords, product.group);
  for (const kw of product.keywords ?? []) addWithVariants(allKeywords, kw);

  for (const tok of tokensFromText(`${product.name} ${product.category} ${product.group}`)) {
    if (tok.length >= 5) addWithVariants(allKeywords, tok);
  }

  const familyMatch = product.name.match(/\b(EWG|DZW|SANICARE|COMBI|EKW|EZD|HDT|HST|HFS|NDR)[-\s]?[\w]*/gi);
  if (familyMatch) {
    for (const f of familyMatch) addKeyword(strongKeywords, f.replace(/[-\s].*/, '').toLowerCase());
  }
}

for (const [de, translations] of Object.entries(TRANSLATIONS)) {
  addWithVariants(allKeywords, de);
  addWithVariants(strongKeywords, de);
  for (const t of translations) addWithVariants(allKeywords, t);
}

const sortedAll = [...allKeywords].sort();
const sortedStrong = [...strongKeywords].sort();
const sortedGate = [...new Set(HYGIENE_GATE.map(normalizeToken))].sort();

const output = `/**
 * AUTO-GENERATED – do not edit by hand.
 * Source: src/data/priceList2026.json (${data.productCount} products, ${data.categories.length} categories)
 * Regenerate: node scripts/generate_price_list_keywords.mjs
 */

/** All price-list derived keywords (with spelling variants & translations) */
export const PRICE_LIST_KEYWORDS = ${JSON.stringify(sortedAll, null, 2)};

/** Category / brand / product-family terms – match without extra hygiene context */
export const PRICE_LIST_STRONG_KEYWORDS = ${JSON.stringify(sortedStrong, null, 2)};

/** Hygiene / cleaning context – required for weaker price-list keyword hits */
export const HYGIENE_GATE_KEYWORDS = ${JSON.stringify(sortedGate, null, 2)};

/** Scoring weights for price-list terms found in tender text */
export const PRICE_LIST_SCORE_WEIGHTS = Object.fromEntries(
  PRICE_LIST_STRONG_KEYWORDS.map((kw) => [kw, 6]),
);

for (const kw of PRICE_LIST_KEYWORDS) {
  if (!(kw in PRICE_LIST_SCORE_WEIGHTS)) PRICE_LIST_SCORE_WEIGHTS[kw] = 4;
}

export function extractPriceListKeywords(text) {
  const lower = (text || '').toLowerCase();
  return PRICE_LIST_KEYWORDS.filter((kw) => lower.includes(kw));
}

export function matchesPriceListKeywords(text) {
  const lower = (text || '').toLowerCase();
  if (PRICE_LIST_STRONG_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  const hasGate = HYGIENE_GATE_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasGate) return false;
  return PRICE_LIST_KEYWORDS.some((kw) => lower.includes(kw));
}

export function scorePriceListKeywords(text) {
  const lower = (text || '').toLowerCase();
  let score = 0;
  const matched = [];
  const seen = new Set();
  for (const kw of PRICE_LIST_KEYWORDS) {
    if (seen.has(kw)) continue;
    if (lower.includes(kw)) {
      const pts = PRICE_LIST_SCORE_WEIGHTS[kw] ?? 3;
      score += pts;
      matched.push(kw);
      seen.add(kw);
    }
  }
  return { score: Math.min(15, score), matched };
}
`;

writeFileSync(OUT_PATH, output, 'utf8');
console.log(`Wrote ${OUT_PATH}`);
console.log(`  PRICE_LIST_KEYWORDS: ${sortedAll.length}`);
console.log(`  PRICE_LIST_STRONG_KEYWORDS: ${sortedStrong.length}`);
console.log(`  HYGIENE_GATE_KEYWORDS: ${sortedGate.length}`);
