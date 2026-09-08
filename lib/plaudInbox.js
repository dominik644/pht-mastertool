import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  fetchSupabasePlaudNote,
  insertSupabasePlaudNote,
  listSupabasePlaudNotes,
  updateSupabasePlaudNoteStatus,
} from './supabasePlaudInbox.js';

function getStorePath() {
  if (process.env.VERCEL === '1') return '/tmp/plaud-inbox.json';
  return join(process.cwd(), 'data', 'plaud-inbox.json');
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
    return v.map((item) => asText(item)).filter(Boolean).join('\n').trim();
  }
  if (typeof v === 'object') {
    return asText(v.value ?? v.text ?? v.content ?? v.summary ?? v.transcript);
  }
  return '';
}

function asList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v.map((item) => asText(item?.title ?? item?.text ?? item?.content ?? item)).filter(Boolean);
  }
  const text = asText(v);
  if (!text) return [];
  return text
    .split(/\n|•|;|\u2022/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

function pick(obj, keys) {
  for (const k of keys) {
    const t = asText(obj?.[k]);
    if (t) return t;
  }
  return '';
}

function parseBody(raw) {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw.trim()); } catch { return { transcript: raw.trim() }; }
  }
  if (Buffer.isBuffer(raw)) return parseBody(raw.toString('utf8'));
  if (typeof raw === 'object') return raw;
  return {};
}

/** Normalize Zapier / Plaud webhook payloads into a note record. */
export function normalizePlaudPayload(rawBody) {
  const body = parseBody(rawBody);
  const src = body?.data && typeof body.data === 'object' && !Array.isArray(body.data)
    ? body.data
    : body;

  const title = pick(src, ['title', 'Title', 'name', 'Name', 'filename', 'fileName'])
    || 'Plaud Note';
  const transcript = pick(src, [
    'transcript', 'Transcript', 'transcription', 'Transcription',
    'full_text', 'fullText', 'text', 'content',
  ]);
  const summary = pick(src, [
    'summary', 'Summary', 'ai_summary', 'aiSummary', 'overview', 'Overview',
  ]);
  const actionItems = asList(
    src.actionItems ?? src.action_items ?? src.ActionItems ?? src.todos ?? src.tasks,
  );
  const recordedAt = pick(src, [
    'recordedAt', 'recorded_at', 'Recorded At', 'createdAt', 'created_at',
    'Created At', 'date', 'timestamp',
  ]) || new Date().toISOString();

  return {
    title,
    transcript,
    summary,
    actionItems,
    recordedAt,
    rawKeys: Object.keys(src || {}),
  };
}

export function extractPlaudNote(rawBody) {
  const note = normalizePlaudPayload(rawBody);
  if (!note.transcript && !note.summary && !note.title) return null;
  if (!note.transcript && !note.summary && note.title === 'Plaud Note') return null;
  return note;
}

function mergeNotes(fromSb, fromFile) {
  const map = new Map();
  for (const note of [...fromSb, ...fromFile]) {
    if (note?.id) map.set(note.id, note);
  }
  return [...map.values()].sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
}

export async function insertPlaudNote(normalized) {
  const id = String(normalized.id || '').trim() || randomBytes(8).toString('hex');
  if (id.startsWith('__')) {
    throw new Error('Ungültige Notiz-ID');
  }
  const existing = readAll()[id] ?? (await fetchSupabasePlaudNote(id));
  if (existing) return { ...existing, skipped: true };
  const note = {
    id,
    title: normalized.title || 'Plaud Note',
    transcript: normalized.transcript || '',
    summary: normalized.summary || '',
    actionItems: Array.isArray(normalized.actionItems) ? normalized.actionItems : [],
    recordedAt: normalized.recordedAt || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    status: 'pending',
  };
  const all = readAll();
  all[id] = note;
  writeAll(all);
  const stored = await insertSupabasePlaudNote(note);
  return {
    ...note,
    persisted: Boolean(stored?.ok),
    persistError: stored?.ok ? null : (stored?.error || (stored?.skipped ? 'supabase-unavailable' : 'persist-failed')),
  };
}

export async function listPendingPlaudNotes() {
  const fromSb = await listSupabasePlaudNotes({ status: 'pending' });
  const fromFile = Object.values(readAll()).filter((n) => n.status === 'pending' && n.id && !String(n.id).startsWith('__'));
  return mergeNotes(fromSb, fromFile);
}

export async function listPlaudNotes({ status } = {}) {
  const fromSb = await listSupabasePlaudNotes(status ? { status } : {});
  let fromFile = Object.values(readAll());
  if (status) fromFile = fromFile.filter((n) => n.status === status);
  return mergeNotes(fromSb, fromFile);
}

export async function fetchPlaudNote(id) {
  return readAll()[id] ?? (await fetchSupabasePlaudNote(id));
}

export async function updatePlaudNoteStatus(id, status) {
  const all = readAll();
  if (all[id]) {
    all[id] = { ...all[id], status };
    writeAll(all);
  }
  await updateSupabasePlaudNoteStatus(id, status);
  return all[id] ?? (await fetchSupabasePlaudNote(id)) ?? { id, status };
}

function queryToken(req) {
  const q = req.query || {};
  return String(q.token || q.secret || q.key || '').trim();
}

export function isPlaudWebhookAuthorized(req) {
  const secret = process.env.PLAUD_WEBHOOK_SECRET?.trim()
    || process.env.CRON_SECRET?.trim()
    || '';
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const auth = String(req.headers?.authorization || '');
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = String(req.headers?.['x-plaud-secret'] || '').trim();
  const q = queryToken(req);
  return token === secret || headerSecret === secret || q === secret;
}

export function plaudPublicBase(req) {
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
