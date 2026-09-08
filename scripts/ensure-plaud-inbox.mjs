#!/usr/bin/env node
/**
 * Creates public.plaud_inbox if missing. Uses SUPABASE_DB_URL / DATABASE_URL.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

function loadEnvFiles() {
  for (const name of ['.env.local', '.env.vercel.tmp']) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"'))
        || (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function main() {
  loadEnvFiles();
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    console.error('No SUPABASE_DB_URL / DATABASE_URL – cannot create plaud_inbox.');
    process.exit(1);
  }

  const sql = readFileSync(join(process.cwd(), 'supabase', 'plaud_inbox.sql'), 'utf8');
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    const check = await client.query("select to_regclass('public.plaud_inbox') as name");
    if (!check.rows[0]?.name) {
      throw new Error('plaud_inbox still missing after apply');
    }
    console.log('ok: public.plaud_inbox');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
