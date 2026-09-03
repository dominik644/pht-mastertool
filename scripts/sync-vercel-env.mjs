#!/usr/bin/env node
/**
 * Synchronisiert .env.local → Vercel (production + development).
 * Liest Werte nur im Speicher – nichts wird ins Git geschrieben.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ENV_FILE = '.env.local';

/** Keys that are safe/useful on Vercel (no VITE_ client secrets in repo). */
const SYNC_KEYS = [
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'DOFFIN_API_KEY',
  'HILMA_API_KEY',
  'MERCADOPUBLICO_TICKET',
  'TENDERNED_API_USERNAME',
  'TENDERNED_API_PASSWORD',
  'CRON_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY',
  'SCHEDULE_TOKEN_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'SCHEDULE_EMAIL_FROM',
  'SCHEDULE_PUBLIC_BASE_URL',
  'SCHEDULE_SALES_NOTIFY_EMAIL',
  'INGEST_ALERT_EMAIL',
  'MS_GRAPH_CLIENT_ID',
  'MS_GRAPH_CLIENT_SECRET',
  'MS_GRAPH_TENANT_ID',
  'INGEST_ALERT_FROM',
  'BC_TENANT_ID',
  'BC_CLIENT_ID',
  'BC_CLIENT_SECRET',
  'BC_ENVIRONMENT',
  'BC_COMPANY_ID',
];

function parseEnvFile(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val && !val.startsWith('your-') && !val.includes('your-')) {
      out[key] = val;
    }
  }
  return out;
}

function vercelAvailable() {
  const r = spawnSync('npx', ['vercel', 'whoami'], { encoding: 'utf8', shell: true, timeout: 30_000 });
  return r.status === 0;
}

function setVercelEnv(name, value, target) {
  spawnSync('npx', ['vercel', 'env', 'rm', name, target, '-y'], {
    stdio: 'ignore',
    shell: true,
  });
  const add = spawnSync('npx', ['vercel', 'env', 'add', name, target], {
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
  });
  return add.status === 0;
}

function main() {
  console.log('=== Vercel Env Sync ===\n');

  if (!existsSync(ENV_FILE)) {
    console.log('⚠ .env.local nicht gefunden – übersprungen.');
    process.exit(0);
  }

  if (!vercelAvailable()) {
    console.log('⚠ Vercel CLI nicht eingeloggt – übersprungen.');
    console.log('  Tipp: npx vercel login && npx vercel link');
    process.exit(0);
  }

  const vars = parseEnvFile(readFileSync(ENV_FILE, 'utf8'));
  let synced = 0;
  let skipped = 0;

  for (const key of SYNC_KEYS) {
    const val = vars[key];
    if (!val) {
      skipped += 1;
      continue;
    }
    for (const target of ['production', 'development']) {
      const ok = setVercelEnv(key, val, target);
      console.log(`${ok ? '✓' : '✗'} ${key} → ${target}`);
      if (ok) synced += 1;
    }
  }

  console.log(`\nFertig: ${synced} gesetzt, ${skipped} Keys ohne Wert in .env.local`);
}

main();
