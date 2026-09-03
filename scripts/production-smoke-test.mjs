#!/usr/bin/env node
/**
 * Production smoke test – https://pht-mastertool.vercel.app
 */
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SMOKE_BASE_URL || 'https://pht-mastertool.vercel.app';
const COOKIE_FILE = join(process.cwd(), '.smoke-cookies.txt');

function loadCronSecret() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return null;
  const m = readFileSync(path, 'utf8').match(/^CRON_SECRET=(.*)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

/** @type {{ name: string, ok: boolean, detail: string }[]} */
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const icon = ok ? '✓' : '✗';
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    signal: AbortSignal.timeout(options.timeout ?? 25_000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  return { res, json, text };
}

async function main() {
  console.log(`=== Smoke Test: ${BASE} ===\n`);

  // 1. Frontend
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(15_000) });
    record('Frontend (/)', res.ok, `HTTP ${res.status}`);
  } catch (e) {
    record('Frontend (/)', false, e instanceof Error ? e.message : String(e));
  }

  // 2. Static data
  try {
    const res = await fetch(`${BASE}/data/customer-priorities.json`, { signal: AbortSignal.timeout(20_000) });
    const ok = res.ok;
    let detail = `HTTP ${res.status}`;
    if (ok) {
      const j = await res.json();
      detail = Array.isArray(j) ? `${j.length} Kunden` : typeof j;
    }
    record('Kundendaten JSON', ok, detail);
  } catch (e) {
    record('Kundendaten JSON', false, e instanceof Error ? e.message : String(e));
  }

  // 3. Supabase app_users
  const cron = loadCronSecret();
  if (cron) {
    try {
      const { res, json } = await fetchJson('/api/ingest?setup=app-users', {
        headers: { Authorization: `Bearer ${cron}` },
      });
      record('Supabase app_users', res.ok && json.ok === true, json.message || json.error || `HTTP ${res.status}`);
    } catch (e) {
      record('Supabase app_users', false, e instanceof Error ? e.message : String(e));
    }
  } else {
    record('Supabase app_users', false, 'CRON_SECRET fehlt lokal');
  }

  // 4. Auth flow
  try {
    unlinkSync(COOKIE_FILE);
  } catch {
    // ignore
  }

  const loginBody = JSON.stringify({ username: 'DominikWeller', password: 'TestPass99!' });
  let sessionCookie = '';

  try {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: loginBody,
      signal: AbortSignal.timeout(20_000),
    });
    const loginJson = await loginRes.json();
    const setCookie = loginRes.headers.getSetCookie?.() ?? [];
    sessionCookie = setCookie.find((c) => c.startsWith('pht_session='))?.split(';')[0] ?? '';
    record(
      'Login (DominikWeller)',
      loginRes.ok && loginJson.ok === true,
      loginJson.user?.role ? `Rolle: ${loginJson.user.role}` : loginJson.error || `HTTP ${loginRes.status}`,
    );
  } catch (e) {
    record('Login (DominikWeller)', false, e instanceof Error ? e.message : String(e));
  }

  if (sessionCookie) {
    try {
      const { res, json } = await fetchJson('/api/auth/me', {
        headers: { Cookie: sessionCookie },
      });
      record('/api/auth/me', res.ok && json.user?.email, json.user?.email || json.error || `HTTP ${res.status}`);
    } catch (e) {
      record('/api/auth/me', false, e instanceof Error ? e.message : String(e));
    }

    try {
      const { res, json } = await fetchJson('/api/tenders-db', {
        headers: { Cookie: sessionCookie },
        timeout: 30_000,
      });
      const count = Array.isArray(json.tenders) ? json.tenders.length : null;
      record('Tenders DB', res.ok && count !== null, count !== null ? `${count} Einträge` : json.error || `HTTP ${res.status}`);
    } catch (e) {
      record('Tenders DB', false, e instanceof Error ? e.message : String(e));
    }

    try {
      const { res, json } = await fetchJson('/api/auth/users', {
        headers: { Cookie: sessionCookie },
      });
      const n = Array.isArray(json.users) ? json.users.length : null;
      record('Auth Users (Admin)', res.ok && n !== null, n !== null ? `${n} Benutzer` : json.error || `HTTP ${res.status}`);
    } catch (e) {
      record('Auth Users (Admin)', false, e instanceof Error ? e.message : String(e));
    }
  } else {
    record('/api/auth/me', false, 'Keine Session');
    record('Tenders DB', false, 'Keine Session');
    record('Auth Users (Admin)', false, 'Keine Session');
  }

  // 5. Public API proxies (require session – RBAC)
  if (sessionCookie) {
    const authedApis = [
      ['/api/tenderned', 'TenderNed RSS'],
      ['/api/bund?limit=1', 'Bund.de'],
    ];
    for (const [path, name] of authedApis) {
      try {
        const res = await fetch(`${BASE}${path}`, {
          headers: { Cookie: sessionCookie },
          signal: AbortSignal.timeout(25_000),
        });
        record(name, res.ok, `HTTP ${res.status}`);
      } catch (e) {
        record(name, false, e instanceof Error ? e.message : String(e));
      }
    }
  } else {
    record('TenderNed RSS', false, 'Keine Session');
    record('Bund.de', false, 'Keine Session');
  }

  // 6. Ingest auth guard
  try {
    const { res, json } = await fetchJson('/api/ingest');
    record('Ingest ohne Token', res.status === 401, json.error || `HTTP ${res.status}`);
  } catch (e) {
    record('Ingest ohne Token', false, e instanceof Error ? e.message : String(e));
  }

  // 7. SPA routes
  for (const route of ['/login', '/command-center', '/sales-funnel', '/priorities']) {
    try {
      const res = await fetch(`${BASE}${route}`, { signal: AbortSignal.timeout(15_000) });
      record(`Route ${route}`, res.ok, `HTTP ${res.status}`);
    } catch (e) {
      record(`Route ${route}`, false, e instanceof Error ? e.message : String(e));
    }
  }

  console.log('\n=== Zusammenfassung ===');
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`${passed}/${results.length} bestanden`);
  if (failed.length) {
    console.log('\nFehlgeschlagen:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
