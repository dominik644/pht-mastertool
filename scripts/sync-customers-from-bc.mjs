/**
 * Batch-sync customer salesRep + contact fields from Business Central into customer-priorities.json.
 *
 * Requires BC env vars in .env.local (see .env.local.example).
 *
 * Usage:
 *   node scripts/sync-customers-from-bc.mjs
 *   node scripts/sync-customers-from-bc.mjs --dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchCustomersWithSalesperson,
  fetchSalespeoplePurchasers,
  isBcConfigured,
  syncFromBusinessCentral,
} from '../lib/businessCentralApi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRIORITIES_PATH = path.join(__dirname, '../public/data/customer-priorities.json');
const dryRun = process.argv.includes('--dry-run');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();

  if (!isBcConfigured()) {
    console.error('BC nicht konfiguriert. Setzen Sie BC_* in .env.local (siehe .env.local.example).');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(PRIORITIES_PATH, 'utf8'));
  const customers = raw.customers ?? [];

  const [salespeople, bcCustomers] = await Promise.all([
    fetchSalespeoplePurchasers(),
    fetchCustomersWithSalesperson(),
  ]);

  const spByCode = new Map(salespeople.map((sp) => [sp.code.toUpperCase(), sp.name]));
  const bcByNumber = new Map(bcCustomers.map((c) => [String(c.number), c]));

  let salesRepUpdated = 0;
  let contactUpdated = 0;

  for (const c of customers) {
    const nr = c.customerNumber ? String(c.customerNumber) : null;
    if (!nr) continue;
    const bc = bcByNumber.get(nr);
    if (!bc?.salespersonCode) continue;
    const repName = spByCode.get(bc.salespersonCode.toUpperCase()) ?? bc.salespersonCode;
    if (repName && c.salesRep !== repName) {
      c.salesRep = repName;
      salesRepUpdated += 1;
    }
  }

  const syncResult = await syncFromBusinessCentral(
    customers.map((c) => ({ id: c.id, customerNumber: c.customerNumber, name: c.name })),
  );

  for (const match of syncResult.matches ?? []) {
    const c = customers.find((x) => x.id === match.localCustomerId);
    if (!c || !match.overlay) continue;
    if (match.overlay.contactEmail && !c.contactEmail) {
      c.contactEmail = match.overlay.contactEmail;
      contactUpdated += 1;
    }
    if (match.overlay.contactPhone && !c.contactPhone) {
      c.contactPhone = match.overlay.contactPhone;
    }
    if (match.overlay.salesRep && !c.salesRep) {
      c.salesRep = match.overlay.salesRep;
    }
  }

  console.log(`BC-Kunden: ${bcCustomers.length}, Verkäufer: ${salespeople.length}`);
  console.log(`salesRep aktualisiert: ${salesRepUpdated}, Kontakte ergänzt: ${contactUpdated}`);
  console.log(`Stammdaten-Matches: ${syncResult.matches?.length ?? 0}`);

  if (dryRun) {
    console.log('Dry-run – keine Datei geschrieben.');
    return;
  }

  raw.generatedAt = new Date().toISOString();
  fs.writeFileSync(PRIORITIES_PATH, `${JSON.stringify(raw, null, 2)}\n`);
  console.log(`Geschrieben: ${PRIORITIES_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
