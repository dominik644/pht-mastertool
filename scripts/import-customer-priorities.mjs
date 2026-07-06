/**
 * Import customer visit priorities from Dominik Weller Excel export.
 * Strips all Umsatz/revenue columns – never written to JSON output.
 *
 * Usage: node scripts/import-customer-priorities.mjs [path-to-xlsx]
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { inferBundesland } from '../lib/bundeslandFromPlz.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_XLSX =
  'C:/Users/Dominik Weller/AppData/Local/Packages/5319275A.WhatsAppDesktop_cv1g1gvanyjgm/LocalState/sessions/0F09956516DECC0610EFFB6937740756DE9F65C5/transfers/2026-27/PHT_Dominik_Weller_2010_2026_AT_final.xlsx';

const OWNER = 'Dominik Weller';
const OUT = path.join(__dirname, '../public/data/customer-priorities.json');

const SECTOR_RULES = [
  { id: 'meat', label: 'Fleisch / Wurst', kw: /fleisch|wurst|schlacht|metzg|salami|schinken|geflügel|gefluegel|hähnchen|haehnchen|huehner|hühner|beef|pork|butcher|reznictv/i, meat: true },
  { id: 'vegan', label: 'Vegan / Pflanzlich', kw: /vegan|pflanz|plant.?based|soja|tofu|seitan|veggie/i, growth: true },
  { id: 'bio', label: 'Bio / Organic', kw: /\bbio\b|organic|öko|oeko|demeter|naturland/i, growth: true },
  { id: 'convenience', label: 'Convenience / TK', kw: /convenience|fertiggericht|tiefkühl|tiefkuehl|snack|fingerfood|ready.?meal/i, growth: true },
  { id: 'dairy', label: 'Molkerei / Milch', kw: /molk|milch|käse|kaese|cheese|joghurt|yogurt|dairy|frischdienst/i, growth: true },
  { id: 'bakery', label: 'Bäckerei / Backwaren', kw: /bäck|baeck|backware|kondit|gebäck|gebaeck|bread|brot/i, growth: true },
  { id: 'pharma', label: 'Pharma / Nutraceutical', kw: /pharma|arznei|nutra|lactoferrin|supplement|vitamin/i, growth: true },
  { id: 'logistics', label: 'Logistik / Transport', kw: /logistik|transport|spedition|cargo|welttransport|lager/i },
  { id: 'beverage', label: 'Getränke / Saft', kw: /getränk|getraenk|saft|juice|brauerei|brewery|mineral/i, growth: true },
  { id: 'ingredients', label: 'Zutaten / Aromen', kw: /aroma|esarom|gewürz|gewuerz|ingredient|extrakt/i },
  { id: 'babyfood', label: 'Babynahrung', kw: /hipp|babynahrung|infant|kindernahrung/i, growth: true },
];

const RESEARCH_LEADS = [
  {
    matchKey: 'sojarei',
    name: 'Sojarei Vollwertkost GmbH',
    city: 'Traiskirchen',
    zip: '2512',
    country: 'AT',
    sector: 'vegan',
    expansionNote: '7 Mio. € Werksausbau Bio-Tofu & Convenience (Apr 2025), 110 MA, Export >50 %',
    researchUrl: 'https://retailreport.at/sojarei-vollwertkost-erhoeht-kapazitaeten',
    potentialScore: 92,
  },
  {
    matchKey: 'soto',
    name: 'organic veggie food GmbH (SOTO)',
    city: 'Bad Endorf',
    zip: '83093',
    country: 'DE',
    sector: 'convenience',
    expansionNote: 'DACH-Vertrieb ausgebaut (Apr 2026), Bio-Convenience & TK-Beeren, >100 MA',
    researchUrl: 'https://vegconomist.de/unternehmen/personalien/soto-erweitert-vertriebsteam-ingo-besemer-uebernimmt-leitung-dach-export/',
    potentialScore: 88,
  },
  {
    matchKey: 'greenforce',
    name: 'Greenforce Future Food AG',
    city: 'München',
    zip: '80331',
    country: 'DE',
    sector: 'vegan',
    expansionNote: 'Übernahme LIVEKINDLY (Jul 2026), pflanzliche Fleisch-/Käse-/Ei-Alternativen, Retail +12 %',
    researchUrl: 'https://vegconomist.com/investments-finance/investments-acquisitions/livekindly-collective-acquires-german-plant-based-brand-greenforce/',
    potentialScore: 86,
  },
  {
    matchKey: 'veganz',
    name: 'Planethic Group AG (Veganz)',
    city: 'Ludwigsfelde',
    zip: '14974',
    country: 'DE',
    sector: 'vegan',
    expansionNote: 'Mililk FoodTech Skalierung, Valora Convenience-Rollout DE/CH, bis 10 Mio. € Finanzierung',
    researchUrl: 'https://vegconomist.com/organisations-and-brands/veganz/',
    potentialScore: 84,
  },
  {
    matchKey: 'vorarlberg milch',
    name: 'Vorarlberg Milch',
    city: 'Feldkirch',
    zip: '6800',
    country: 'AT',
    sector: 'dairy',
    expansionNote: '7 Mio. € Modernisierung Joghurt/Getränke-Linien (Fertigstellung Ende 2026), NÖM-Fusion',
    researchUrl: 'https://www.foodbev.com/news/lactalis-germany-invests-50m-to-expand-neuburg-dairy-production-capacity',
    potentialScore: 82,
  },
  {
    matchKey: 'lactalis',
    name: 'Lactalis Deutschland (Neuburger Milchwerke)',
    city: 'Neuburg',
    zip: '86633',
    country: 'DE',
    sector: 'dairy',
    expansionNote: '50 Mio. € Werksausbau Quark/Molke, Betrieb ab Aug 2026, +70 Stellen',
    researchUrl: 'https://www.foodbev.com/news/lactalis-germany-invests-50m-to-expand-neuburg-dairy-production-capacity',
    potentialScore: 80,
  },
  {
    matchKey: 'pacifico biolabs',
    name: 'Pacifico Biolabs GmbH',
    city: 'Berlin',
    zip: '10115',
    country: 'DE',
    sector: 'vegan',
    expansionNote: '7 Mio. € Finanzierung Myzel-Protein, Skalierung in DE-Brauerei-Infrastruktur',
    researchUrl: 'https://vegconomist.com/',
    potentialScore: 78,
  },
  {
    matchKey: 'verrano',
    name: 'Verrano GmbH',
    city: 'Wien',
    zip: '1010',
    country: 'AT',
    sector: 'convenience',
    expansionNote: 'High-six-figure Finanzierung fermentierte Gemüse-Convenience (2026)',
    researchUrl: 'https://vegconomist.com/',
    potentialScore: 76,
  },
  {
    matchKey: 'dmk deutsches milchkontor',
    name: 'DMK Deutsches Milchkontor GmbH',
    city: 'Bremen',
    zip: '28195',
    country: 'DE',
    sector: 'dairy',
    expansionNote: '55 Mio. € Edewecht-Ausbau WPC80 + Logistik, Arla-Fusion ab Jun 2026',
    researchUrl: 'https://www.just-food.com/news/dmk-group-german-plant-capex/',
    potentialScore: 75,
  },
  {
    matchKey: 'backwerk',
    name: 'Backwerk (systhema caffè GmbH)',
    city: 'Hamburg',
    zip: '20354',
    country: 'DE',
    sector: 'bakery',
    expansionNote: 'Industrielle Backwaren-Kette DACH, Filial- & Zentralproduktion Expansion',
    researchUrl: 'https://www.foodbev.com/',
    potentialScore: 72,
  },
  {
    matchKey: 'alnatura',
    name: 'Alnatura Produktions- und Handels GmbH',
    city: 'Bickenbach',
    zip: '64404',
    country: 'DE',
    sector: 'bio',
    expansionNote: 'Bio-FMCG Marktführer DACH, eigene Produktion & Zentrallager',
    researchUrl: 'https://www.alnatura.de/',
    potentialScore: 70,
  },
  {
    matchKey: 'rübezahl',
    name: 'Rübezahl Schokoladen GmbH',
    city: 'Achern',
    zip: '77855',
    country: 'DE',
    sector: 'convenience',
    expansionNote: 'Convenience-Schokolade & Snacks, Private Label DACH',
    researchUrl: 'https://www.ruebezahl.de/',
    potentialScore: 68,
  },
];

function classifySector(name) {
  const n = name.toLowerCase();
  for (const rule of SECTOR_RULES) {
    if (rule.kw.test(n)) return rule;
  }
  return { id: 'food', label: 'Lebensmittel / Sonstige', meat: false, growth: false };
}

function inferCountry(zip, city) {
  const plz = String(zip).trim();
  const c = String(city).toLowerCase();
  if (/baku|azer/i.test(c)) return 'OTHER';
  if (/budapest|debrecen|győr|gyor/i.test(c)) return 'HU';
  if (/praha|brno|ostrava|plzeň|plzen/i.test(c)) return 'CZ';
  if (/bratislava|košice|kosice/i.test(c)) return 'SK';
  if (/ljubljana|maribor/i.test(c)) return 'SI';
  if (/^\d{4}$/.test(plz)) return 'AT';
  if (/^\d{5}$/.test(plz)) return 'DE';
  if (/^\d{4}$/.test(plz) && plz.startsWith('8')) return 'CH';
  return 'AT';
}

function parseExcelStatus(prio) {
  const p = String(prio);
  const inactive = /inaktiv/i.test(p);
  const active = /aktiv/i.test(p) && !inactive;
  const formerA = /ehem/i.test(p);
  const urgent = /SOFORT/i.test(p);
  return { inactive, active, formerA, urgent, raw: p };
}

function computePotentialScore({ sector, excelScore, status, exchangeHints, country, isMeat }) {
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

function assignPriority({ sector, isMeat, potentialScore, excelAbc, status }) {
  if (isMeat) return 'C';
  if (sector.growth && (sector.id === 'vegan' || sector.id === 'bio' || sector.id === 'convenience' || sector.id === 'pharma')) {
    if (potentialScore >= 45) return 'A';
  }
  if (sector.growth && potentialScore >= 55) return 'A';
  if (excelAbc === 'A' && !isMeat && potentialScore >= 40) return 'A';
  if (excelAbc === 'B' || potentialScore >= 35) return 'B';
  return 'C';
}

function cadenceMonths(priority) {
  if (priority === 'A') return 1;
  if (priority === 'B') return 3;
  return 6;
}

function slugId(prefix, name, nr) {
  const base = `${prefix}-${nr || name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  return base;
}

function parseExchange(row) {
  const hints = [];
  const fields = [
    { col: 13, label: 'Wasch' },
    { col: 14, label: 'Schaum' },
    { col: 15, label: 'Schleuse' },
    { col: 16, label: 'Details' },
  ];
  for (const f of fields) {
    const v = String(row[f.col] ?? '').trim();
    if (v && v !== '-' && v !== '–') {
      hints.push(f.col === 16 ? v : `${f.label}: ${v}`);
    }
  }
  return hints;
}

function main() {
  const xlsxPath = process.argv[2] || DEFAULT_XLSX;
  if (!fs.existsSync(xlsxPath)) {
    console.error('Excel not found:', xlsxPath);
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets['Potenzialanalyse'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const dataRows = rows.slice(2).filter((r) => r[0]);

  const excelCustomers = dataRows.map((row) => {
    const name = String(row[1]).trim();
    const zip = String(row[2]).trim();
    const city = String(row[3]).trim();
    const excelAbc = String(row[4]).trim();
    const excelScore = Number(row[5]) || 0;
    const status = parseExcelStatus(row[6]);
    const daysSincePurchase = Number(row[11]) || null;
    const active2026 = !/nein/i.test(String(row[12]));
    const exchangeHints = parseExchange(row);
    const country = inferCountry(zip, city);
    const sector = classifySector(name);
    const isMeat = !!sector.meat;
    const potentialScore = computePotentialScore({
      sector,
      excelScore,
      status,
      exchangeHints,
      country,
      isMeat,
    });
    const priority = assignPriority({ sector, isMeat, potentialScore, excelAbc, status });

    return {
      id: slugId('cust', name, row[0]),
      customerNumber: String(row[0]),
      name,
      city,
      zip,
      country,
      bundesland: inferBundesland(zip, country, city),
      sector: sector.id,
      sectorLabel: sector.label,
      priority,
      potentialScore,
      visitCadenceMonths: cadenceMonths(priority),
      source: 'excel',
      owner: OWNER,
      excelAbc,
      excelScore,
      excelStatus: status.raw,
      active2026,
      daysSincePurchase,
      exchangePotential: exchangeHints,
      isMeatIndustry: isMeat,
    };
  });

  const excelNames = excelCustomers.map((c) => c.name.toLowerCase());

  function isDuplicateResearch(lead) {
    const key = lead.matchKey.toLowerCase();
    return excelNames.some((n) => n.includes(key));
  }

  const researchCustomers = RESEARCH_LEADS.filter((lead) => !isDuplicateResearch(lead)).map((lead) => {
    const sector = SECTOR_RULES.find((s) => s.id === lead.sector) || { id: lead.sector, label: lead.sector, growth: true };
    const priority = assignPriority({
      sector,
      isMeat: false,
      potentialScore: lead.potentialScore,
      excelAbc: 'A',
      status: { active: true, inactive: false, formerA: false, urgent: false },
    });
    return {
      id: slugId('research', lead.name, ''),
      customerNumber: null,
      name: lead.name,
      city: lead.city,
      zip: lead.zip,
      country: lead.country,
      bundesland: inferBundesland(lead.zip, lead.country, lead.city),
      sector: sector.id,
      sectorLabel: sector.label,
      priority,
      potentialScore: lead.potentialScore,
      visitCadenceMonths: cadenceMonths(priority),
      source: 'research',
      owner: OWNER,
      excelAbc: null,
      excelScore: null,
      excelStatus: null,
      active2026: true,
      daysSincePurchase: null,
      exchangePotential: [],
      expansionNote: lead.expansionNote,
      researchUrl: lead.researchUrl,
      isMeatIndustry: false,
    };
  });

  const all = [...excelCustomers, ...researchCustomers].sort((a, b) => {
    const priOrder = { A: 0, B: 1, C: 2 };
    const pd = priOrder[a.priority] - priOrder[b.priority];
    if (pd !== 0) return pd;
    if (a.country === 'AT' && b.country !== 'AT') return -1;
    if (b.country === 'AT' && a.country !== 'AT') return 1;
    return b.potentialScore - a.potentialScore;
  });

  const countPri = (list, p) => list.filter((c) => c.priority === p).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    owner: OWNER,
    region: 'AT / DACH',
    strategy: 'Ausrüstung & Anlagen · Fleisch depriorisiert · Wachstumsbranchen A',
    importedFromExcel: excelCustomers.length,
    addedFromResearch: researchCustomers.length,
    priorityCounts: {
      A: countPri(all, 'A'),
      B: countPri(all, 'B'),
      C: countPri(all, 'C'),
    },
    visitCadence: { A: 'monatlich', B: 'quartalsweise', C: 'halbjährlich' },
    customers: all,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');

  console.log('Written:', OUT);
  console.log('Excel:', excelCustomers.length, '| Research:', researchCustomers.length);
  console.log('Priority A/B/C:', payload.priorityCounts.A, '/', payload.priorityCounts.B, '/', payload.priorityCounts.C);
}

main();
