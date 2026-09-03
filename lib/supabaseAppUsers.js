import { hashPassword } from './appAuth.js';

function normalizeSupabaseUrl(url) {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

function getClient() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function hasAppUsersDb() {
  return Boolean(getClient());
}

/** @returns {Promise<{ email: string, passwordHash: string, name?: string, admin: boolean, disabled: boolean, bcSalespersonCode?: string, salesRep?: string }[]>} */
export async function fetchDbUsers() {
  const client = getClient();
  if (!client) return [];
  const res = await fetch(`${client.url}/rest/v1/app_users?select=email,name,password_hash,admin,disabled,bc_salesperson_code,sales_rep`, {
    headers: {
      apikey: client.key,
      Authorization: `Bearer ${client.key}`,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    email: String(r.email).toLowerCase(),
    passwordHash: r.password_hash,
    name: r.name ?? undefined,
    admin: Boolean(r.admin),
    disabled: Boolean(r.disabled),
    bcSalespersonCode: r.bc_salesperson_code ? String(r.bc_salesperson_code).trim() : undefined,
    salesRep: r.sales_rep ? String(r.sales_rep).trim() : undefined,
  }));
}

/** @returns {Promise<{ email: string, name?: string, admin: boolean, disabled: boolean, bcSalespersonCode?: string, salesRep?: string, source: string }[]>} */
export async function listUsersPublic() {
  const rows = await fetchDbUsers();
  return rows.map((u) => ({
    email: u.email,
    name: u.name,
    admin: u.admin,
    disabled: u.disabled,
    bcSalespersonCode: u.bcSalespersonCode,
    salesRep: u.salesRep,
    source: 'db',
  }));
}

/** @param {{ email: string, password: string, name?: string, admin?: boolean, bcSalespersonCode?: string, salesRep?: string }} input */
export async function createDbUser(input) {
  const client = getClient();
  if (!client) return { ok: false, error: 'Supabase nicht konfiguriert' };
  const email = input.email.trim().toLowerCase();
  const passwordHash = hashPassword(input.password);
  const res = await fetch(`${client.url}/rest/v1/app_users`, {
    method: 'POST',
    headers: {
      apikey: client.key,
      Authorization: `Bearer ${client.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      email,
      password_hash: passwordHash,
      name: input.name ?? null,
      admin: Boolean(input.admin),
      disabled: false,
      bc_salesperson_code: input.bcSalespersonCode?.trim() || null,
      sales_rep: input.salesRep?.trim() || null,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 409) return { ok: false, error: 'E-Mail bereits vorhanden' };
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err.slice(0, 160) };
  }
  return { ok: true };
}

/** @param {{ email: string, password: string, name?: string, admin?: boolean, bcSalespersonCode?: string, salesRep?: string }} input */
export async function persistDbUserPassword(input) {
  const existing = await fetchDbUsers();
  const found = existing.some((u) => u.email === input.email.trim().toLowerCase());
  if (found) {
    return updateDbUser({ email: input.email, password: input.password });
  }
  return createDbUser({
    email: input.email,
    password: input.password,
    name: input.name,
    admin: input.admin,
    bcSalespersonCode: input.bcSalespersonCode,
    salesRep: input.salesRep,
  });
}

/** @param {{ email: string, password: string, name?: string, admin?: boolean, bcSalespersonCode?: string, salesRep?: string }} input */
export async function upsertDbUserPassword(input) {
  return persistDbUserPassword(input);
}

/** @param {{ email: string, disabled?: boolean, admin?: boolean, password?: string, bcSalespersonCode?: string | null, salesRep?: string | null }} input */
export async function updateDbUser(input) {
  const client = getClient();
  if (!client) return { ok: false, error: 'Supabase nicht konfiguriert' };
  const email = input.email.trim().toLowerCase();
  /** @type {Record<string, unknown>} */
  const patch = {};
  if (typeof input.disabled === 'boolean') patch.disabled = input.disabled;
  if (typeof input.admin === 'boolean') patch.admin = input.admin;
  if (input.password) patch.password_hash = hashPassword(input.password);
  if (input.bcSalespersonCode !== undefined) {
    patch.bc_salesperson_code = input.bcSalespersonCode?.trim() || null;
  }
  if (input.salesRep !== undefined) {
    patch.sales_rep = input.salesRep?.trim() || null;
  }
  if (!Object.keys(patch).length) return { ok: false, error: 'Keine Änderungen' };

  const res = await fetch(`${client.url}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      apikey: client.key,
      Authorization: `Bearer ${client.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err.slice(0, 160) };
  }
  return { ok: true };
}

/** @param {string} email */
export async function deleteDbUser(email) {
  const client = getClient();
  if (!client) return { ok: false, error: 'Supabase nicht konfiguriert' };
  const normalized = email.trim().toLowerCase();
  const res = await fetch(`${client.url}/rest/v1/app_users?email=eq.${encodeURIComponent(normalized)}`, {
    method: 'DELETE',
    headers: {
      apikey: client.key,
      Authorization: `Bearer ${client.key}`,
      Prefer: 'return=minimal',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err.slice(0, 160) };
  }
  return { ok: true };
}
