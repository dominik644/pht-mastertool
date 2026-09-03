#!/usr/bin/env node
/**
 * Daily customer discovery – DACH + SEE leads catalog, merge new companies into
 * customer-priorities.json with isNewLead + discoveredAt metadata.
 *
 * Usage: node scripts/daily-customer-discovery.mjs [--geocode]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcileAddress } from '../lib/plzReconciliation.js';
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
const PRIORITIES = path.join(__dirname, '../public/data/customer-priorities.json');
const DACH_LEADS = path.join(__dirname, '../public/data/dach-food-leads.json');
const DISCOVERY_LEARNING = path.join(__dirname, '../public/data/discovery-learning.json');
const OWNER = 'Dominik Weller';
const RUN_GEOCODE = process.argv.includes('--geocode');

function slugId(prefix, name) {
  return `${prefix}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
}

function runBuildLeads() {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'build-dach-leads.mjs')], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function leadToCustomer(lead, discoveredAt) {
  const reconciled = await reconcileAddress({
    zip: lead.zip,
    city: lead.city,
    country: lead.country,
    name: lead.name,
    source: 'daily-discovery',
    useNominatim: true,
  });

  const sector = SECTOR_RULES.find((s) => s.id === lead.sector) || classifySector(lead.name);
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

  return {
    id: slugId('discovery', lead.name),
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
    source: 'daily-discovery',
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
    isNewLead: true,
    discoveredAt,
    ...(reconciled.plzWarning ? { plzWarning: true, plzWarningDetail: reconciled.plzWarningDetail } : {}),
    ...(reconciled.plzCorrected ? { plzCorrected: true, originalZip: reconciled.originalZip } : {}),
  };
}

async function loadDiscoveryProfile() {
  const fromFile = loadJson(DISCOVERY_LEARNING, null);
  if (fromFile?.version) return fromFile;
  return emptyDiscoveryProfile();
}

async function main() {
  console.log('=== Daily Customer Discovery (DACH + SEE) ===');
  runBuildLeads();

  const discoveryProfile = await loadDiscoveryProfile();
  if (discoveryProfile.boostSectorIds?.length || discoveryProfile.excludeSectorIds?.length) {
    console.log('Discovery-Lernprofil aktiv:',
      `boost=${discoveryProfile.boostSectorIds?.join(',') || '—'}`,
      `exclude=${discoveryProfile.excludeSectorIds?.join(',') || '—'}`);
  }

  const discoveredAt = new Date().toISOString();
  const existing = loadJson(PRIORITIES, { customers: [] });
  const customers = Array.isArray(existing.customers) ? [...existing.customers] : [];
  const dach = loadJson(DACH_LEADS, { leads: [] });
  const leads = Array.isArray(dach.leads) ? dach.leads : [];

  const newLeads = leads
    .filter((l) => !isDuplicateLead(l, customers))
    .filter((l) => !shouldSkipDiscoveryLead(l, discoveryProfile))
    .sort((a, b) => scoreDiscoveryLead(b, discoveryProfile) - scoreDiscoveryLead(a, discoveryProfile));
  console.log(`DACH leads total: ${leads.length} | New vs customers: ${newLeads.length}`);

  const added = [];
  for (const lead of newLeads) {
    const customer = await leadToCustomer(lead, discoveredAt);
    if (!isDuplicateLead(customer, customers)) {
      customers.push(customer);
      added.push(customer);
    }
  }

  const countPri = (p) => customers.filter((c) => c.priority === p).length;

  const payload = {
    ...existing,
    generatedAt: discoveredAt,
    owner: OWNER,
    region: PHT_CUSTOMER_PROFILE.region,
    strategy: PHT_CUSTOMER_PROFILE.strategy,
    customerProfile: {
      version: PHT_CUSTOMER_PROFILE.version,
      priorityASectors: PRIORITY_A_SECTORS_EXPORT,
      targetIndustries: PHT_CUSTOMER_PROFILE.targetIndustries.map((t) => t.label),
      excludePatterns: PHT_CUSTOMER_PROFILE.excludePatterns.map((e) => e.description),
    },
    addedFromDailyDiscovery: (existing.addedFromDailyDiscovery ?? 0) + added.length,
    lastDiscoveryRun: discoveredAt,
    dachLeadsSource: 'public/data/dach-food-leads.json',
    priorityCounts: {
      A: countPri('A'),
      B: countPri('B'),
      C: countPri('C'),
    },
    customers: customers.sort((a, b) => {
      const priOrder = { A: 0, B: 1, C: 2 };
      const pd = priOrder[a.priority] - priOrder[b.priority];
      if (pd !== 0) return pd;
      if (a.country === 'AT' && b.country !== 'AT') return -1;
      if (b.country === 'AT' && a.country !== 'AT') return 1;
      return b.potentialScore - a.potentialScore;
    }),
  };

  fs.writeFileSync(PRIORITIES, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Added ${added.length} new customers (isNewLead=true)`);
  console.log(`Total customers: ${customers.length}`);
  console.log(`Priority A/B/C: ${payload.priorityCounts.A} / ${payload.priorityCounts.B} / ${payload.priorityCounts.C}`);

  if (RUN_GEOCODE && added.length > 0) {
    console.log('Running geocode for new entries…');
    const r = spawnSync(
      process.execPath,
      [path.join(__dirname, 'geocode-customer-priorities.mjs'), '--nominatim', '--reconcile'],
      { stdio: 'inherit', cwd: path.join(__dirname, '..') },
    );
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}

const PRIORITY_A_SECTORS_EXPORT = [
  'convenience', 'vegan', 'bio', 'insects', 'plant_based', 'frozen', 'pharma', 'babyfood',
];

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
