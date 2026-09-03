/** @returns {string | null} */
export function normalizeSupabaseUrl(raw) {
  if (!raw) return null;
  return raw.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');
}

/** @returns {string | null} */
export function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const ref = host.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

export const APP_USERS_SQL = `
create table if not exists public.app_users (
  email text primary key,
  password_hash text not null,
  name text,
  admin boolean not null default false,
  disabled boolean not null default false,
  bc_salesperson_code text,
  sales_rep text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

drop policy if exists "service manage app_users" on public.app_users;
create policy "service manage app_users"
  on public.app_users for all
  to service_role
  using (true)
  with check (true);

notify pgrst, 'reload schema';
`.trim();

/** @returns {Promise<{ exists: boolean, status: number, detail?: string }>} */
export async function checkAppUsersTable(url, key) {
  const res = await fetch(`${url}/rest/v1/app_users?select=email&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (res.ok) return { exists: true, status: res.status };
  const text = await res.text();
  if (/PGRST205|could not find the table/i.test(text)) {
    return { exists: false, status: res.status, detail: 'PGRST205' };
  }
  return { exists: false, status: res.status, detail: text.slice(0, 200) };
}

/** @returns {string | null} */
function resolveDbUrl() {
  const direct = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (direct?.trim()) return direct.trim();

  const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  const baseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const ref = baseUrl ? projectRefFromUrl(baseUrl) : null;
  if (!password || !ref) return null;

  const host = process.env.SUPABASE_DB_HOST || `db.${ref}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT || '5432';
  const user = process.env.SUPABASE_DB_USER || 'postgres';
  const db = process.env.SUPABASE_DB_NAME || 'postgres';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
}

/** @returns {Promise<{ ok: boolean, method?: string, error?: string }>} */
export async function runAppUsersMigrationViaPg() {
  const connectionString = resolveDbUrl();
  if (!connectionString) {
    return {
      ok: false,
      error: 'Keine DB-Verbindung: SUPABASE_DB_URL oder SUPABASE_DB_PASSWORD in Vercel setzen',
    };
  }

  let pg;
  try {
    pg = await import('pg');
  } catch {
    return { ok: false, error: 'pg-Modul nicht installiert' };
  }

  const client = new pg.default.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  });

  try {
    await client.connect();
    await client.query(APP_USERS_SQL);
    return { ok: true, method: 'pg' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await client.end().catch(() => {});
  }
}

/** @returns {Promise<{ ok: boolean, method?: string, error?: string }>} */
export async function runAppUsersMigrationViaExecSqlRpc() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false, error: 'Supabase nicht konfiguriert' };

  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: APP_USERS_SQL }),
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 404) {
    return { ok: false, error: 'exec_sql RPC nicht vorhanden' };
  }
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `exec_sql ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true, method: 'exec_sql-rpc' };
}

/** @returns {Promise<{ ok: boolean, method?: string, error?: string }>} */
export async function runAppUsersMigrationViaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const baseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const ref = baseUrl ? projectRefFromUrl(baseUrl) : null;
  if (!token || !ref) {
    return { ok: false, error: 'SUPABASE_ACCESS_TOKEN fehlt' };
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: APP_USERS_SQL }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Management API ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true, method: 'management-api' };
}

/** @returns {Promise<{ ok: boolean, existed?: boolean, method?: string, error?: string, hints?: string[] }>} */
export async function ensureAppUsersTable() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return { ok: false, error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen' };
  }

  const check = await checkAppUsersTable(url, key);
  if (check.exists) return { ok: true, existed: true };

  const hints = [];
  let lastError = check.detail || 'Tabelle fehlt';

  const rpc = await runAppUsersMigrationViaExecSqlRpc();
  if (rpc.ok) {
    const after = await checkAppUsersTable(url, key);
    if (after.exists) return { ok: true, existed: false, method: rpc.method };
    lastError = 'Migration lief, Tabelle noch nicht sichtbar';
  } else if (!rpc.error?.includes('nicht vorhanden')) {
    hints.push(rpc.error);
  }

  const mgmt = await runAppUsersMigrationViaManagementApi();
  if (mgmt.ok) {
    const after = await checkAppUsersTable(url, key);
    if (after.exists) return { ok: true, existed: false, method: mgmt.method };
    lastError = 'Migration lief, Tabelle noch nicht sichtbar';
  } else if (!mgmt.error?.includes('fehlt')) {
    hints.push(mgmt.error);
  }

  const pgResult = await runAppUsersMigrationViaPg();
  if (pgResult.ok) {
    const after = await checkAppUsersTable(url, key);
    if (after.exists) return { ok: true, existed: false, method: pgResult.method };
    lastError = 'Migration lief, Tabelle noch nicht sichtbar';
  } else if (!pgResult.error?.includes('Keine DB-Verbindung')) {
    hints.push(pgResult.error);
  }

  return {
    ok: false,
    error: lastError,
    project: projectRefFromUrl(url) ?? undefined,
    hints: [
      ...hints,
      'Supabase Dashboard → Project Settings → Database → Connection string (URI) als SUPABASE_DB_URL in Vercel',
      'Oder supabase/app_users.sql im SQL Editor ausführen',
    ],
  };
}
