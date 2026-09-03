#!/usr/bin/env node
/**
 * Prüft Supabase-Verbindung und ob Schema-Tabellen existieren.
 * Wendet schema.sql an, wenn SUPABASE_DB_URL gesetzt ist (psql).
 * Sonst: Anleitung für Supabase SQL Editor.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
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
    if (!process.env[key]) process.env[key] = val;
  }
}

function normalizeUrl(raw) {
  if (!raw) return null;
  return raw.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');
}

async function tableExists(url, key, table) {
  try {
    const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 404 || res.status === 406) return false;
    const text = await res.text();
    if (text.includes('PGRST205') || text.includes('Could not find')) return false;
    return res.ok || res.status === 200;
  } catch {
    return null;
  }
}

async function main() {
  loadEnvLocal();

  const url = normalizeUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  console.log('=== Supabase Schema ===\n');

  if (!url || !key) {
    console.log('⚠ SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen – Schema übersprungen.');
    console.log('  Vertrieb nutzt localStorage-Fallback (kein Setup nötig).');
    process.exit(0);
  }

  const tables = ['sales_feedback', 'customer_visits', 'schedule_proposals'];
  const checks = {};
  for (const t of tables) {
    checks[t] = await tableExists(url, key, t);
  }

  const allPresent = tables.every((t) => checks[t] === true);
  if (allPresent) {
    console.log('✓ Alle Tabellen vorhanden:', tables.join(', '));
    process.exit(0);
  }

  console.log('Tabellen-Status:');
  for (const t of tables) {
    const icon = checks[t] === true ? '✓' : checks[t] === false ? '✗' : '?';
    console.log(`  ${icon} ${t}`);
  }

  const schemaPath = join(process.cwd(), 'supabase', 'schema.sql');
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (dbUrl) {
    console.log('\nVersuche schema.sql via psql …');
    const psql = spawnSync('psql', [dbUrl, '-f', schemaPath], {
      stdio: 'inherit',
      shell: true,
    });
    if (psql.status === 0) {
      console.log('✓ Schema angewendet.');
      process.exit(0);
    }
    console.log('✗ psql fehlgeschlagen (Exit', psql.status, ')');
  }

  const npx = spawnSync('npx', ['supabase', '--version'], { encoding: 'utf8', shell: true });
  if (npx.status === 0) {
    console.log('\nSupabase CLI gefunden – versuche db push …');
    const push = spawnSync('npx', ['supabase', 'db', 'push'], { stdio: 'inherit', shell: true });
    if (push.status === 0) {
      console.log('✓ Schema via Supabase CLI angewendet.');
      process.exit(0);
    }
  }

  console.log('\n--- Manuelle Schritte (einmalig) ---');
  console.log('1. Supabase Dashboard → SQL Editor');
  console.log('2. Inhalt von supabase/schema.sql einfügen und ausführen');
  console.log(`   Datei: ${schemaPath}`);
  console.log('3. Optional: SUPABASE_DB_URL in .env.local für automatisches psql');
  process.exit(checks.schedule_proposals === false ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
