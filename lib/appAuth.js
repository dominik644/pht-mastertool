import crypto from 'node:crypto';
import { nameToUsername } from './defaultAppUsers.js';

const SESSION_COOKIE = 'pht_session';
const SESSION_DAYS = 14;

function sessionSecret() {
  const s = process.env.APP_SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === 'production') return null;
    return 'dev-insecure-session-secret-change-me';
  }
  return s;
}

/** @returns {{ email: string, password?: string, passwordHash?: string, name?: string, admin?: boolean, disabled?: boolean, bcSalespersonCode?: string, salesRep?: string, source?: string }[]} */
export function parseEnvUsers() {
  const raw = process.env.APP_USERS;
  if (!raw?.trim()) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((u) => u && typeof u.email === 'string')
      .map((u) => ({
        email: u.email.trim().toLowerCase(),
        username: typeof u.username === 'string'
          ? u.username.trim()
          : (typeof u.name === 'string' ? nameToUsername(u.name) : undefined),
        password: typeof u.password === 'string' ? u.password : undefined,
        passwordHash: typeof u.passwordHash === 'string' ? u.passwordHash : undefined,
        name: typeof u.name === 'string' ? u.name.trim() : undefined,
        admin: Boolean(u.admin),
        disabled: Boolean(u.disabled),
        bcSalespersonCode: typeof u.bcSalespersonCode === 'string'
          ? u.bcSalespersonCode.trim()
          : (typeof u.bc_salesperson_code === 'string' ? u.bc_salesperson_code.trim() : undefined),
        salesRep: typeof u.salesRep === 'string'
          ? u.salesRep.trim()
          : (typeof u.sales_rep === 'string' ? u.sales_rep.trim() : undefined),
        source: 'env',
      }));
  } catch {
    return [];
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.scryptSync(password, salt, 64).toString('base64url');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith('scrypt:')) {
    const [, salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64).toString('base64url');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
  }
  const a = Buffer.from(stored);
  const b = Buffer.from(password);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** @param {{ email: string, username?: string, password?: string, passwordHash?: string, name?: string, admin?: boolean, disabled?: boolean, bcSalespersonCode?: string, salesRep?: string, mustChangePassword?: boolean, source?: string }[]} dbUsers */
export function mergeUsers(envUsers, dbUsers = [], fileUsers = []) {
  const byEmail = new Map();
  for (const u of fileUsers) {
    if (!u.disabled) byEmail.set(u.email, { ...u, source: u.source ?? 'file' });
  }
  for (const u of envUsers) {
    if (!u.disabled) byEmail.set(u.email, { ...u, source: 'env' });
  }
  for (const u of dbUsers) {
    byEmail.set(u.email, { ...u, source: 'db' });
  }
  return [...byEmail.values()];
}

/** @param {string} loginId */
export function normalizeLoginId(loginId) {
  return String(loginId ?? '').trim();
}

/** @param {{ email: string, username?: string, password?: string, passwordHash?: string, disabled?: boolean }[]} users */
export function findUserForLogin(users, loginId, password) {
  const raw = normalizeLoginId(loginId);
  const lower = raw.toLowerCase();
  const compact = lower.replace(/\s+/g, '');
  const user = users.find((u) => {
    if (u.email === lower) return true;
    if (u.username && u.username.toLowerCase() === compact) return true;
    if (u.name && u.name.replace(/\s+/g, '').toLowerCase() === compact) return true;
    return false;
  });
  if (!user || user.disabled) return null;
  const hash = user.passwordHash ?? user.password;
  if (!hash || !verifyPassword(password, hash)) return null;
  return user;
}

export function adminEmail() {
  return (process.env.APP_ADMIN_EMAIL || '').trim().toLowerCase() || null;
}

/** @param {{ email: string, admin?: boolean }} user */
export function isAdminUser(user) {
  if (!user) return false;
  if (user.admin) return true;
  const admin = adminEmail();
  return Boolean(admin && user.email === admin);
}

/** @param {{ email: string, username?: string, name?: string, admin?: boolean, bcSalespersonCode?: string, salesRep?: string, disabled?: boolean, mustChangePassword?: boolean }} match */
export function buildUserProfile(match) {
  if (!match || match.disabled) return null;
  const admin = isAdminUser(match);
  return {
    email: match.email,
    username: match.username ?? null,
    name: match.name ?? match.email.split('@')[0],
    admin,
    role: admin ? 'admin' : 'user',
    bcSalespersonCode: match.bcSalespersonCode ?? null,
    salesRep: match.salesRep ?? match.name ?? null,
    mustChangePassword: Boolean(match.mustChangePassword),
  };
}

/** @param {import('http').IncomingMessage} req @param {{ setHeader: Function, status: Function }} res */
export async function guardAppAdminAuth(req, res, loadAllUsers) {
  const guard = guardAppAuth(req, res, { allowUnconfigured: false });
  if (!guard.ok) return { ok: false };
  if (guard.unconfigured && process.env.NODE_ENV !== 'production') {
    return { ok: true, user: { email: 'dev@local', name: 'Dev', admin: true, role: 'admin' } };
  }
  const users = await loadAllUsers();
  const match = users.find((u) => u.email === guard.user.email);
  const profile = buildUserProfile(match);
  if (!profile) {
    res.status(401).json({ error: 'Benutzer nicht gefunden', authRequired: true });
    return { ok: false };
  }
  if (!profile.admin) {
    res.status(403).json({ error: 'Nur für Administratoren', adminRequired: true });
    return { ok: false };
  }
  return { ok: true, user: profile };
}

export function createSessionToken(email) {
  const secret = sessionSecret();
  if (!secret) throw new Error('APP_SESSION_SECRET nicht konfiguriert');
  const payload = {
    email: email.trim().toLowerCase(),
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySessionToken(token) {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  const [data, sig] = String(token).split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.email || !payload.exp || Date.now() > payload.exp) return null;
    return { email: String(payload.email).toLowerCase() };
  } catch {
    return null;
  }
}

function parseCookies(header) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(rest.join('='));
  }
  return out;
}

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers?.cookie);
  const token = cookies[SESSION_COOKIE];
  return verifySessionToken(token);
}

export function sessionCookieHeader(token, { secure = process.env.NODE_ENV === 'production' } = {}) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookieHeader({ secure = process.env.NODE_ENV === 'production' } = {}) {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function hasAppAuthConfig() {
  return parseEnvUsers().some((u) => !u.disabled && (u.password || u.passwordHash))
    || Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
    || true;
}

/** Public schedule/customer API paths – no app login required */
export function isPublicApiPath(pathname) {
  const p = String(pathname || '').split('?')[0];
  return (
    p.startsWith('/api/auth/login')
    || p.startsWith('/api/auth/logout')
    || p.startsWith('/api/auth/change-password')
    || p.includes('schedule-confirm')
    || p.includes('schedule-wish')
    || p.includes('book/wish')
    || p.includes('schedule-wish-accept')
  );
}

/**
 * Guard API handler – returns session user or sends 401.
 * @param {import('http').IncomingMessage & { query?: Record<string, string> }} req
 * @param {{ setHeader: (k: string, v: string) => void, status: (code: number) => { json: (d: unknown) => void } }} res
 * @param {{ allowUnconfigured?: boolean }} [opts]
 */
export function guardAppAuth(req, res, opts = {}) {
  const original = String(req.headers?.['x-vercel-original-url'] || req.headers?.['x-original-url'] || req.url || '');
  const path = original.split('?')[0];
  if (isPublicApiPath(path)) return { ok: true, user: null, public: true };

  if (!hasAppAuthConfig()) {
    if (opts.allowUnconfigured !== false && process.env.NODE_ENV !== 'production') {
      return { ok: true, user: { email: 'dev@local', admin: true, role: 'admin' }, unconfigured: true };
    }
    if (opts.allowUnconfigured) {
      return { ok: true, user: null, unconfigured: true };
    }
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: 'Nicht angemeldet', authRequired: true });
    return { ok: false };
  }
  return { ok: true, user: session };
}
