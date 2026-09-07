import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

function getStorePath() {
  if (process.env.VERCEL === '1') return '/tmp/snapaddy-inbox.json';
  return join(process.cwd(), 'data', 'snapaddy-inbox.json');
}

function readAll() {
  const path = getStorePath();
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  const path = getStorePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(map, null, 2), 'utf8');
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

export function normalizeSnapaddyPayload(body) {
  const src = body?.data && typeof body.data === 'object' ? body.data : body;
  const firstName = pick(src, ['firstName', 'firstname', 'first_name', 'givenName']);
  const lastName = pick(src, ['lastName', 'lastname', 'last_name', 'familyName', 'surname']);
  const fullName = pick(src, ['fullName', 'name', 'displayName'])
    || [firstName, lastName].filter(Boolean).join(' ').trim();
  return {
    firstName,
    lastName,
    fullName,
    email: pick(src, ['email', 'emailAddress', 'mail']),
    phone: pick(src, ['phone', 'phoneNumber', 'telephone', 'mobile', 'mobilePhone']),
    role: pick(src, ['position', 'jobTitle', 'title', 'role']),
    company: pick(src, ['organization', 'organisation', 'company', 'companyName', 'account']),
    street: pick(src, ['street', 'streetAddress', 'address']),
    zip: pick(src, ['zip', 'zipCode', 'postalCode', 'plz']),
    city: pick(src, ['city', 'ort', 'town']),
    country: pick(src, ['country', 'countryCode', 'land']) || 'AT',
    website: pick(src, ['website', 'url', 'homepage']),
  };
}

export function insertSnapaddyCard(normalized) {
  const id = randomBytes(8).toString('hex');
  const card = {
    id,
    ...normalized,
    receivedAt: new Date().toISOString(),
    status: 'pending',
  };
  const all = readAll();
  all[id] = card;
  writeAll(all);
  return card;
}

export function listPendingSnapaddyCards() {
  return Object.values(readAll())
    .filter((c) => c.status === 'pending')
    .sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
}

export function fetchSnapaddyCard(id) {
  return readAll()[id] ?? null;
}

export function updateSnapaddyCardStatus(id, status) {
  const all = readAll();
  if (!all[id]) return null;
  all[id] = { ...all[id], status };
  writeAll(all);
  return all[id];
}

export function isSnapaddyWebhookAuthorized(req) {
  const secret = process.env.SNAPADDY_WEBHOOK_SECRET?.trim()
    || process.env.CRON_SECRET?.trim()
    || '';
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const auth = String(req.headers?.authorization || '');
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = String(req.headers?.['x-snapaddy-secret'] || '').trim();
  return token === secret || headerSecret === secret;
}

export function snapaddyPublicBase(req) {
  if (process.env.SCHEDULE_PUBLIC_BASE_URL) {
    return process.env.SCHEDULE_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim();
  if (host) {
    const proto = req.headers?.['x-forwarded-proto'] || 'https';
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  return 'http://localhost:5173';
}
