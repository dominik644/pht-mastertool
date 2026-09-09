import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseVcard } from './parseVcard.js';
import {
  insertSupabaseSnapaddyCard,
  listSupabasePendingSnapaddyCards,
  updateSupabaseSnapaddyCardStatus,
} from './supabaseSnapaddyInbox.js';

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

function asText(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
  if (Array.isArray(v)) {
    for (const item of v) {
      const t = asText(item?.value ?? item?.number ?? item?.email ?? item?.address ?? item);
      if (t) return t;
    }
    return '';
  }
  if (typeof v === 'object') {
    return asText(v.value ?? v.number ?? v.email ?? v.address ?? v.name ?? v.organizationName);
  }
  return '';
}

function pick(obj, keys) {
  for (const k of keys) {
    const t = asText(obj?.[k]);
    if (t) return t;
  }
  return '';
}

export function normalizeSnapaddyPayload(body) {
  const src = body?.data && typeof body.data === 'object' && !Array.isArray(body.data)
    ? body.data
    : body;
  const orgObj = typeof src?.organization === 'object' ? src.organization : null;
  const firstName = pick(src, ['firstName', 'firstname', 'first_name', 'givenName', 'vorname']);
  const lastName = pick(src, ['lastName', 'lastname', 'last_name', 'familyName', 'surname', 'nachname']);
  const fullName = pick(src, ['fullName', 'name', 'displayName', 'fn'])
    || [firstName, lastName].filter(Boolean).join(' ').trim();
  return {
    firstName,
    lastName,
    fullName,
    email: pick(src, ['email', 'emailAddress', 'mail', 'emailAddresses']),
    phone: pick(src, ['phone', 'phoneNumber', 'telephone', 'mobile', 'mobilePhone', 'phoneNumbers', 'phones', 'tel']),
    role: pick(src, ['position', 'jobTitle', 'title', 'role', 'jobtitle']),
    company: pick(src, ['organization', 'organisation', 'company', 'companyName', 'account', 'firma'])
      || asText(orgObj),
    street: pick(src, ['street', 'streetAddress', 'address', 'strasse']),
    zip: pick(src, ['zip', 'zipCode', 'postalCode', 'plz']),
    city: pick(src, ['city', 'ort', 'town']),
    country: pick(src, ['country', 'countryCode', 'land']) || 'AT',
    website: pick(src, ['website', 'url', 'homepage']),
  };
}

function parseBody(raw) {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/BEGIN:VCARD/i.test(trimmed)) return { _vcard: trimmed };
    try { return JSON.parse(trimmed); } catch { return {}; }
  }
  if (Buffer.isBuffer(raw)) return parseBody(raw.toString('utf8'));
  if (typeof raw === 'object') return raw;
  return {};
}

export function extractSnapaddyContacts(rawBody) {
  const body = parseBody(rawBody);
  if (body._vcard) {
    return parseVcard(body._vcard).map((c) => normalizeSnapaddyPayload(c));
  }
  if (typeof body.vcard === 'string') {
    return parseVcard(body.vcard).map((c) => normalizeSnapaddyPayload(c));
  }

  const candidates = [];
  if (Array.isArray(body)) candidates.push(...body);
  else if (Array.isArray(body.data)) candidates.push(...body.data);
  else if (Array.isArray(body.contacts)) candidates.push(...body.contacts);
  else if (Array.isArray(body.participants)) candidates.push(...body.participants);
  else if (Array.isArray(body.items)) candidates.push(...body.items);
  else if (body.contact && typeof body.contact === 'object') candidates.push(body.contact);
  else if (body.participant && typeof body.participant === 'object') candidates.push(body.participant);
  else candidates.push(body);

  return candidates
    .map((c) => normalizeSnapaddyPayload(c))
    .filter((c) => c.company || c.fullName || c.email);
}

export async function insertSnapaddyCard(normalized) {
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
  await insertSupabaseSnapaddyCard(card);
  return card;
}

export async function listPendingSnapaddyCards() {
  const fromSb = await listSupabasePendingSnapaddyCards();
  const fromFile = Object.values(readAll()).filter((c) => c.status === 'pending');
  const map = new Map();
  for (const card of [...fromSb, ...fromFile]) {
    if (card?.id) map.set(card.id, card);
  }
  return [...map.values()].sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
}

export function fetchSnapaddyCard(id) {
  return readAll()[id] ?? null;
}

export async function updateSnapaddyCardStatus(id, status) {
  const all = readAll();
  if (all[id]) {
    all[id] = { ...all[id], status };
    writeAll(all);
  }
  await updateSupabaseSnapaddyCardStatus(id, status);
  return all[id] ?? { id, status };
}

function queryToken(req) {
  const q = req.query || {};
  return String(q.token || q.secret || q.key || '').trim();
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
  if (token === secret || headerSecret === secret) return true;
  if (process.env.NODE_ENV === 'production') return false;
  const q = queryToken(req);
  return q === secret;
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
