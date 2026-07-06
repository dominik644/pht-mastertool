/**
 * Import customer visit priorities from Dominik Weller Excel export.
 * Strips all Umsatz/revenue columns – never written to JSON output.
 * PLZ/Ort always taken from Excel (source of truth); validated & reconciled via lib/plzReconciliation.js.
 *
 * Usage: node scripts/import-customer-priorities.mjs [path-to-xlsx] [--nominatim]
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { reconcileAddress, inferCountryFromCity } from '../lib/plzReconciliation.js';
import {
  PHT_CUSTOMER_PROFILE,
  SECTOR_RULES,
  classifySector,
  computePotentialScore,
  assignPriority,
  cadenceMonths,
  isDuplicateLead,
} from '../lib/phtCustomerProfile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_XLSX =
  'C:/Users/Dominik Weller/AppData/Local/Packages/5319275A.WhatsAppDesktop_cv1g1gvanyjgm/LocalState/sessions/0F09956516DECC0610EFFB6937740756DE9F65C5/transfers/2026-27/PHT_Dominik_Weller_2010_2026_AT_final.xlsx';

const OWNER = 'Dominik Weller';
const OUT = path.join(__dirname, '../public/data/customer-priorities.json');
const DACH_LEADS = path.join(__dirname, '../public/data/dach-food-leads.json');

/** High-priority research leads with URLs (merged with dach-food-leads.json). */
const CURATED_RESEARCH_LEADS = [
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
    matchKey: 'lactalis neuburg',
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
    matchKey: 'inzersdorfer',
    name: 'Inzersdorfer (MARESI Austria GmbH)',
    city: 'Wien',
    zip: '1130',
    country: 'AT',
    sector: 'convenience',
    expansionNote: 'Marke der MARESI/Vivatis Austria – Fertiggerichte, Aufstriche, Suppen (ohne Kühlung). Sitz Hietzing 1130 Wien.',
    researchUrl: 'https://www.vivatis.at/en/inzersdorfer',
    potentialScore: 74,
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

function loadDachLeads() {
  if (!fs.existsSync(DACH_LEADS)) return [];
  const data = JSON.parse(fs.readFileSync(DACH_LEADS, 'utf8'));
  return data.leads ?? [];
}

function mergeResearchLeads() {
  const fromFile = loadDachLeads();
  const merged = [...CURATED_RESEARCH_LEADS];
  for (const lead of fromFile) {
    if (!isDuplicateLead(lead, merged)) merged.push(lead);
  }
  return merged;
}

function inferCountry(zip, city) {
  const fromCity = inferCountryFromCity(city);
  if (fromCity) return fromCity;
  const raw = String(zip).trim();
  if (/^\d{3}\s\d{2}$/.test(raw)) return 'CZ';
  const compact = raw.replace(/\s+/g, '');
  if (/^\d{4}$/.test(compact)) return 'AT';
  if (/^\d{5}$/.test(compact)) return 'DE';
  if (/^\d{4}$/.test(compact) && compact.startsWith('8')) return 'CH';
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

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const useNominatim = process.argv.includes('--nominatim');
  const xlsxPath = args[0] || DEFAULT_XLSX;
  if (!fs.existsSync(xlsxPath)) {
    console.error('Excel not found:', xlsxPath);
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets['Potenzialanalyse'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const dataRows = rows.slice(2).filter((r) => r[0] && String(r[1] ?? '').trim());

  let plzCorrected = 0;
  let plzWarnings = 0;

  const excelCustomers = [];
  for (const row of dataRows) {
    const name = String(row[1]).trim();
    const excelZip = String(row[2]).trim();
    const excelCity = String(row[3]).trim();
    const excelAbc = String(row[4]).trim();
    const excelScore = Number(row[5]) || 0;
    const status = parseExcelStatus(row[6]);
    const daysSincePurchase = Number(row[11]) || null;
    const active2026 = !/nein/i.test(String(row[12]));
    const exchangeHints = parseExchange(row);
    const country = inferCountry(excelZip, excelCity);

    const reconciled = await reconcileAddress({
      zip: excelZip,
      city: excelCity,
      country,
      name,
      source: 'excel',
      useNominatim,
    });
    if (reconciled.plzCorrected) plzCorrected += 1;
    if (reconciled.plzWarning) plzWarnings += 1;

    const sector = classifySector(name);
    const isMeat = !!sector.meat;
    const potentialScore = computePotentialScore({
      sector,
      excelScore,
      status,
      exchangeHints,
      country: reconciled.country,
      isMeat,
    });
    const priority = assignPriority({ sector, isMeat, potentialScore, excelAbc, status });

    excelCustomers.push({
      id: slugId('cust', name, row[0]),
      customerNumber: String(row[0]),
      name,
      city: reconciled.city,
      zip: reconciled.zip,
      country: reconciled.country,
      bundesland: reconciled.bundesland,
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
      ...(reconciled.plzWarning ? { plzWarning: true, plzWarningDetail: reconciled.plzWarningDetail } : {}),
      ...(reconciled.plzCorrected ? { plzCorrected: true, originalZip: reconciled.originalZip } : {}),
    });
  }

  const allResearchLeads = mergeResearchLeads();
  const researchCustomers = [];
  for (const lead of allResearchLeads.filter((l) => !isDuplicateLead(l, excelCustomers))) {
    const reconciled = await reconcileAddress({
      zip: lead.zip,
      city: lead.city,
      country: lead.country,
      name: lead.name,
      source: 'research',
      useNominatim: true,
    });
    if (reconciled.plzCorrected) plzCorrected += 1;
    if (reconciled.plzWarning) plzWarnings += 1;

    const sector =
      SECTOR_RULES.find((s) => s.id === lead.sector) ||
      classifySector(lead.name);
    const isMeat = !!sector.meat || lead.sector === 'meat';
    const potentialScore = computePotentialScore({
      sector,
      potentialScore: lead.potentialScore,
      country: reconciled.country,
      isMeat,
    });
    const priority = assignPriority({
      sector,
      isMeat,
      potentialScore,
      excelAbc: isMeat ? 'C' : 'A',
      status: { active: true, inactive: false, formerA: false, urgent: false },
    });
    researchCustomers.push({
      id: slugId('research', lead.name, ''),
      customerNumber: null,
      name: lead.name,
      city: reconciled.city,
      zip: reconciled.zip,
      country: reconciled.country,
      bundesland: reconciled.bundesland,
      sector: sector.id,
      sectorLabel: sector.label,
      priority,
      potentialScore,
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
      isMeatIndustry: isMeat,
      ...(reconciled.plzWarning ? { plzWarning: true, plzWarningDetail: reconciled.plzWarningDetail } : {}),
      ...(reconciled.plzCorrected ? { plzCorrected: true, originalZip: reconciled.originalZip } : {}),
    });
  }

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
    region: PHT_CUSTOMER_PROFILE.region,
    strategy: PHT_CUSTOMER_PROFILE.strategy,
    customerProfile: {
      version: PHT_CUSTOMER_PROFILE.version,
      priorityASectors: ['convenience', 'vegan', 'bio', 'pharma', 'babyfood'],
      targetIndustries: PHT_CUSTOMER_PROFILE.targetIndustries.map((t) => t.label),
      excludePatterns: PHT_CUSTOMER_PROFILE.excludePatterns.map((e) => e.description),
    },
    importedFromExcel: excelCustomers.length,
    addedFromResearch: researchCustomers.length,
    dachLeadsSource: 'public/data/dach-food-leads.json',
    priorityCounts: {
      A: countPri(all, 'A'),
      B: countPri(all, 'B'),
      C: countPri(all, 'C'),
    },
    plzReconciliation: {
      corrected: plzCorrected,
      warnings: plzWarnings,
      nominatim: useNominatim,
    },
    visitCadence: { A: 'alle 6 Monate', B: 'alle 12 Monate', C: 'alle 18 Monate' },
    customers: all,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');

  console.log('Written:', OUT);
  console.log('Excel:', excelCustomers.length, '| Research:', researchCustomers.length);
  console.log('Priority A/B/C:', payload.priorityCounts.A, '/', payload.priorityCounts.B, '/', payload.priorityCounts.C);
  console.log('PLZ korrigiert:', plzCorrected, '| PLZ-Warnungen:', plzWarnings);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
