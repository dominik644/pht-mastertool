#!/usr/bin/env node
/**
 * Legt public.app_users in Supabase an (SUPABASE_DB_URL oder Management-API).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ensureAppUsersTable } from '../lib/appUsersMigration.js';

function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
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

async function main() {
  loadEnvLocal();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen in .env.local');
    console.error('Alternativ auf Production:');
    console.error('  curl -H "Authorization: Bearer $CRON_SECRET" "https://pht-mastertool.vercel.app/api/ingest?setup=app-users"');
    process.exit(1);
  }

  const result = await ensureAppUsersTable();
  if (result.ok) {
    console.log(result.existed ? '✓ Tabelle public.app_users existiert bereits.' : `✓ public.app_users angelegt (${result.method}).`);
    process.exit(0);
  }

  console.error('✗', result.error);
  if (result.hints?.length) {
    console.error('\nHinweise:');
    for (const hint of result.hints) console.error(`  - ${hint}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
