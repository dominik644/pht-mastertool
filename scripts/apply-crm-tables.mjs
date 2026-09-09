#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

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

loadEnvLocal();
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.log('Kein SUPABASE_DB_URL – supabase/customer_details.sql im SQL Editor ausführen.');
  process.exit(0);
}
const result = spawnSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', 'supabase/customer_details.sql'], {
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status === 0 ? 0 : result.status ?? 1);
