#!/usr/bin/env node
/**
 * One-click Production Setup – validiert Env, optional Schema/Vercel, baut Projekt.
 */
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
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
    out[key] = val;
    if (!process.env[key]) process.env[key] = val;
  }
  return out;
}

function hasRealValue(val) {
  if (!val) return false;
  if (val.startsWith('your-') || val.includes('your-')) return false;
  if (val === 'sk-your-openai-key') return false;
  return true;
}

function status(ok, label, detail = '') {
  const icon = ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`${icon} ${label}${detail ? ` – ${detail}` : ''}`);
  return ok;
}

function ensureScheduleSecretHint(env) {
  if (hasRealValue(env.SCHEDULE_TOKEN_SECRET) || hasRealValue(env.CRON_SECRET)) {
    return true;
  }
  const examplePath = join(process.cwd(), '.env.local.example');
  const secret = randomBytes(32).toString('hex');
  const hint = `\n# Generiert von setup:production – in .env.local eintragen:\n# SCHEDULE_TOKEN_SECRET=${secret}\n`;
  try {
    const existing = readFileSync(examplePath, 'utf8');
    if (!existing.includes('GENERATED_SCHEDULE_TOKEN')) {
      appendFileSync(examplePath, `\n# GENERATED_SCHEDULE_TOKEN (Beispiel – nicht committen)\n# SCHEDULE_TOKEN_SECRET=${secret}\n`);
    }
  } catch {
    // ignore
  }
  console.log(`\n${YELLOW}ℹ SCHEDULE_TOKEN_SECRET fehlt.${RESET}`);
  console.log(`  Fügen Sie in .env.local ein (nicht committen):`);
  console.log(`  SCHEDULE_TOKEN_SECRET=${secret}`);
  return false;
}

function main() {
  console.log('=== PHT Mastertool – Production Setup ===\n');

  const env = loadEnvLocal();
  const results = [];

  results.push(status(existsSync('public/data/customer-priorities.json'), 'Kundendaten (customer-priorities.json)'));
  results.push(status(
    hasRealValue(env.SUPABASE_URL) && hasRealValue(env.SUPABASE_SERVICE_KEY),
    'Supabase (optional)',
    hasRealValue(env.SUPABASE_URL) ? 'konfiguriert' : 'localStorage-Fallback aktiv',
  ));

  const hasSecret = hasRealValue(env.SCHEDULE_TOKEN_SECRET) || hasRealValue(env.CRON_SECRET);
  if (!hasSecret) ensureScheduleSecretHint(env);
  results.push(status(
    true,
    'Terminvorschläge',
    hasSecret ? 'Production-Secret gesetzt' : 'Dev-Fallback (Datei-Speicher + E-Mail-Vorschau)',
  ));

  results.push(status(
    hasRealValue(env.RESEND_API_KEY) || hasRealValue(env.MS_GRAPH_CLIENT_ID),
    'E-Mail-Versand (optional)',
    hasRealValue(env.RESEND_API_KEY) ? 'Resend' : 'E-Mail-Vorschau-Fallback',
  ));

  results.push(status(
    hasRealValue(env.BC_CLIENT_ID) && hasRealValue(env.BC_CLIENT_SECRET),
    'Business Central (optional)',
    hasRealValue(env.BC_CLIENT_ID) ? 'konfiguriert' : 'Setup-CTA in App',
  ));

  console.log('\n--- Supabase Schema ---');
  const schema = spawnSync('node', ['scripts/apply-supabase-schema.mjs'], {
    stdio: 'inherit',
    shell: true,
  });
  results.push(status(schema.status === 0, 'Supabase Schema'));

  console.log('\n--- Vercel Env (optional) ---');
  const vercel = spawnSync('node', ['scripts/sync-vercel-env.mjs'], {
    stdio: 'inherit',
    shell: true,
  });
  results.push(status(vercel.status === 0, 'Vercel Env Sync', 'optional'));

  console.log('\n--- Build ---');
  const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
  results.push(status(build.status === 0, 'npm run build'));

  const critical = [
    existsSync('public/data/customer-priorities.json'),
    build.status === 0,
  ];
  const allCritical = critical.every(Boolean);
  const optionalFails = results.filter((_, i) => !results[i] && i > 0).length;

  console.log('\n=== Ergebnis ===');
  if (allCritical) {
    console.log(`${GREEN}Bereit für Go-Live (Kernflows ohne externe Secrets).${RESET}`);
    if (optionalFails > 0) {
      console.log(`${YELLOW}${optionalFails} optionale Checks offen – siehe oben.${RESET}`);
    }
  } else {
    console.log(`${RED}Kritische Checks fehlgeschlagen – Build oder Daten prüfen.${RESET}`);
    process.exit(1);
  }
}

main();
