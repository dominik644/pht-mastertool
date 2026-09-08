#!/usr/bin/env node
/**
 * Übernimmt den Plaud-CLI-Login (refresh_token) ins Tool.
 * Schreibt nie den Token-Wert nach stdout.
 *
 *   node scripts/setup-plaud-token.mjs
 *   node scripts/setup-plaud-token.mjs --vercel
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir as osHomedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { savePlaudRefreshToken } from '../lib/supabasePlaudInbox.js';
import { plaudAccountStatus, storePlaudRefreshToken, syncPlaudFromAccount } from '../lib/plaudPull.js';

const ENV_PATH = join(process.cwd(), '.env.local');
const CLI_TOKENS = join(osHomedir(), '.plaud', 'tokens.json');

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

function readCliRefreshToken() {
  if (!existsSync(CLI_TOKENS)) return '';
  try {
    const raw = JSON.parse(readFileSync(CLI_TOKENS, 'utf8'));
    return typeof raw?.refresh_token === 'string' ? raw.refresh_token.trim() : '';
  } catch {
    return '';
  }
}

function setVercelEnv(name, value, target) {
  spawnSync('npx', ['vercel', 'env', 'rm', name, target, '-y'], {
    stdio: 'ignore',
    shell: true,
  });
  const add = spawnSync('npx', ['vercel', 'env', 'add', name, target], {
    input: `${value}\n`,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    encoding: 'utf8',
  });
  return add.status === 0;
}

async function main() {
  loadEnvLocal();
  const token = readCliRefreshToken() || process.env.PLAUD_REFRESH_TOKEN?.trim() || '';
  if (!token) {
    console.error('Kein Plaud-Token. Zuerst: npx @plaud-ai/cli login');
    process.exit(1);
  }

  upsertEnvKey('PLAUD_REFRESH_TOKEN', token);
  process.env.PLAUD_REFRESH_TOKEN = token;
  await storePlaudRefreshToken(token);
  const savedSb = await savePlaudRefreshToken(token);
  const status = await plaudAccountStatus();
  if (!status.connected) {
    console.error('Plaud-Konto nicht verbunden (Token ungültig oder abgelaufen).');
    process.exit(1);
  }

  console.log(`Plaud verbunden${status.name ? `: ${status.name}` : ''}`);
  console.log('Token in .env.local gespeichert (nicht im Git).');
  console.log(savedSb ? 'Token in Supabase gespeichert.' : 'Supabase-Token übersprungen (Tabelle/Env fehlt).');

  const sync = await syncPlaudFromAccount();
  console.log(`Abruf: ${sync.imported} neu, ${sync.skipped} schon da, ${sync.pending || 0} ohne Transkript`);

  const wantVercel = process.argv.includes('--vercel');
  if (wantVercel) {
    let okCount = 0;
    for (const target of ['production', 'preview', 'development']) {
      const ok = setVercelEnv('PLAUD_REFRESH_TOKEN', token, target);
      console.log(`${ok ? 'ok' : 'fehlgeschlagen'}: Vercel ${target}`);
      if (ok) okCount += 1;
    }
    if (!okCount) {
      console.error('Vercel-Env konnte nicht gesetzt werden.');
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
