#!/usr/bin/env node
/**
 * Hunter.io API einrichten und testen.
 *
 * Usage:
 *   node scripts/setup-hunter-api.mjs --key=YOUR_HUNTER_API_KEY
 *   node scripts/setup-hunter-api.mjs   (liest HUNTER_API_KEY aus .env.local)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkHunterAccount, enrichContactViaHunter } from '../lib/contactEnrichmentApi.js';

const ENV_PATH = join(process.cwd(), '.env.local');

function loadEnvLocal() {
  if (!existsSync(ENV_PATH)) return;
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function upsertEnvKey(key, value) {
  const line = `${key}=${value}`;
  if (!existsSync(ENV_PATH)) {
    writeFileSync(ENV_PATH, `${line}\n`, 'utf8');
    return;
  }
  const content = readFileSync(ENV_PATH, 'utf8');
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) {
    writeFileSync(ENV_PATH, content.replace(re, line), 'utf8');
  } else {
    writeFileSync(ENV_PATH, `${content.trimEnd()}\n${line}\n`, 'utf8');
  }
}

async function main() {
  loadEnvLocal();

  const keyArg = process.argv.find((a) => a.startsWith('--key='));
  const key = keyArg ? keyArg.slice('--key='.length).trim() : process.env.HUNTER_API_KEY?.trim();

  if (!key) {
    console.error('HUNTER_API_KEY fehlt.');
    console.error('');
    console.error('1. Kostenlosen Key holen: https://hunter.io/users/sign_up');
    console.error('2. Dann ausführen:');
    console.error('   node scripts/setup-hunter-api.mjs --key=DEIN_KEY');
    console.error('');
    console.error('Vercel (Production):');
    console.error('   npx vercel env add HUNTER_API_KEY production');
    console.error('');
    console.error('GitHub Actions (wöchentliches Enrichment):');
    console.error('   Repository → Settings → Secrets → HUNTER_API_KEY');
    process.exit(1);
  }

  process.env.HUNTER_API_KEY = key;
  upsertEnvKey('HUNTER_API_KEY', key);
  console.log('✓ HUNTER_API_KEY in .env.local gespeichert\n');

  const account = await checkHunterAccount();
  if (!account.ok) {
    console.error('✗ Hunter API-Test fehlgeschlagen:', account.error);
    process.exit(1);
  }

  console.log('✓ Hunter API verbunden');
  console.log(`  Konto: ${account.email ?? '—'}`);
  console.log(`  Plan: ${account.plan ?? '—'}`);
  const available = account.requestsAvailable;
  if (available != null) {
    const n = typeof available === 'object' ? available?.searches ?? available?.available : available;
    console.log(`  Requests verfügbar: ${n ?? JSON.stringify(available)}`);
  }
  if (account.requestsUsed != null) {
    console.log(`  Requests genutzt: ${account.requestsUsed}`);
  }

  console.log('\nProbe-Anreicherung (3 Testfirmen):');
  const samples = [
    { name: 'Manner GmbH', country: 'AT', city: 'Perg' },
    { name: 'Pfanner', country: 'AT', city: 'Lauterach' },
    { name: 'Bonduelle', country: 'DE', city: 'Rheinberg' },
  ];

  for (const sample of samples) {
    const hit = await enrichContactViaHunter(sample);
    console.log(`  ${sample.name}: ${hit?.contactEmail ?? '—'} ${hit ? `(${hit.enrichmentSource})` : ''}`);
  }

  console.log('\nNächster Schritt – Batch starten:');
  console.log('  npm run enrich:contacts:missing');
  console.log('\nVercel Production:');
  console.log('  npx vercel env add HUNTER_API_KEY production');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
