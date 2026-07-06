import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CATALOG from './data/dach-food-leads-catalog.mjs';
import { classifySector, isDuplicateLead } from '../lib/phtCustomerProfile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRIORITIES = path.join(__dirname, '../public/data/customer-priorities.json');
const EXISTING_LEADS = path.join(__dirname, '../public/data/dach-food-leads.json');
const OUT = EXISTING_LEADS;

const toMatchKey = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const readJson = (filePath, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
};

function normalizeLead(lead) {
  const sector = lead.sector || classifySector(lead.name).id || 'food';
  return {
    ...lead,
    matchKey: lead.matchKey || toMatchKey(lead.name),
    sector,
    potentialScore: Math.max(50, Math.min(90, Number(lead.potentialScore || 60))),
  };
}

function main() {
  const priorities = readJson(PRIORITIES, { customers: [] });
  const customers = Array.isArray(priorities.customers) ? priorities.customers : [];

  const oldLeadFile = readJson(EXISTING_LEADS, { leads: [] });
  const existingLeads = Array.isArray(oldLeadFile.leads) ? oldLeadFile.leads : [];

  const mergedCandidates = [...existingLeads, ...CATALOG].map(normalizeLead);

  const seen = new Set();
  const unique = [];
  const skipped = [];
  let newCatalogLeads = 0;

  for (const lead of mergedCandidates) {
    const key = `${lead.matchKey}|${lead.country}|${lead.zip}`;
    if (seen.has(key)) {
      skipped.push(`${lead.name} (exact-key)`);
      continue;
    }
    seen.add(key);

    if (isDuplicateLead(lead, unique)) {
      skipped.push(`${lead.name} (merged-duplicate)`);
      continue;
    }

    unique.push(lead);
  }

  for (const lead of CATALOG.map(normalizeLead)) {
    if (!isDuplicateLead(lead, customers)) {
      newCatalogLeads += 1;
    }
  }

  if (CATALOG.length < 350) {
    throw new Error(`Catalog has only ${CATALOG.length} leads. Minimum required is 350.`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'scripts/data/dach-food-leads-catalog.mjs',
    regionFocus: 'AT + DE + CH with selected EU',
    catalogCount: CATALOG.length,
    catalogNewVsCustomers: newCatalogLeads,
    mergedCandidateCount: mergedCandidates.length,
    afterDedup: unique.length,
    skippedDuplicates: skipped.length,
    leads: unique,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Catalog leads: ${CATALOG.length}`);
  console.log(`New catalog leads vs customers: ${newCatalogLeads}`);
  console.log(`Output leads after dedup: ${unique.length}`);
}

main();
