import { homedir } from 'node:os';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fetchPlaudNote, insertPlaudNote } from './plaudInbox.js';
import { loadPlaudRefreshToken, savePlaudRefreshToken } from './supabasePlaudInbox.js';

const API_BASE = 'https://platform.plaud.ai/developer/api';
const REFRESH_URL = `${API_BASE}/oauth/third-party/access-token/refresh`;
const SUMMARY_TYPE = 'auto_sum_note';
const TRANSCRIPT_TYPES = ['transaction_polish', 'transaction'];
const MAX_IMPORT = 4;
const LIST_PAGE_SIZE = 20;
const BUDGET_MS = 8000;

function oauthFilePath() {
  if (process.env.VERCEL === '1') return '/tmp/plaud-oauth.json';
  return join(process.cwd(), 'data', 'plaud-oauth.json');
}

function readFileToken() {
  try {
    const raw = JSON.parse(readFileSync(oauthFilePath(), 'utf8'));
    return typeof raw?.refresh_token === 'string' ? raw.refresh_token.trim() : '';
  } catch {
    return '';
  }
}

function writeFileToken(refreshToken) {
  const path = oauthFilePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ refresh_token: refreshToken, updatedAt: new Date().toISOString() }), 'utf8');
}

function readCliToken() {
  if (process.env.VERCEL === '1') return '';
  try {
    const raw = JSON.parse(readFileSync(join(homedir(), '.plaud', 'tokens.json'), 'utf8'));
    return typeof raw?.refresh_token === 'string' ? raw.refresh_token.trim() : '';
  } catch {
    return '';
  }
}

export async function resolvePlaudRefreshToken() {
  const fromSb = await loadPlaudRefreshToken();
  return fromSb
    || readFileToken()
    || process.env.PLAUD_REFRESH_TOKEN?.trim()
    || readCliToken()
    || '';
}

export async function storePlaudRefreshToken(refreshToken) {
  const token = String(refreshToken || '').trim();
  if (!token) throw new Error('Token fehlt');
  writeFileToken(token);
  await savePlaudRefreshToken(token);
  return true;
}

export async function plaudAccountStatus() {
  const refresh = await resolvePlaudRefreshToken();
  if (!refresh) return { connected: false };
  try {
    const access = await refreshAccessToken(refresh);
    const me = await plaudRequest('/open/third-party/users/current', access.accessToken);
    return {
      connected: true,
      name: String(me?.name || me?.email || me?.data?.name || me?.data?.email || '').trim() || null,
    };
  } catch {
    return { connected: false, expired: true };
  }
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ refresh_token: refreshToken }),
    signal: AbortSignal.timeout(12_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error('Plaud-Login abgelaufen');
  }
  let data = {};
  try { data = JSON.parse(text); } catch { /* ignore */ }
  const accessToken = String(data.access_token || '').trim();
  if (!accessToken) throw new Error('Plaud-Login abgelaufen');
  const nextRefresh = String(data.refresh_token || refreshToken).trim();
  if (nextRefresh && nextRefresh !== refreshToken) {
    writeFileToken(nextRefresh);
    await savePlaudRefreshToken(nextRefresh);
  }
  return { accessToken, refreshToken: nextRefresh };
}

async function plaudRequest(path, accessToken) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`Plaud API ${res.status}`);
  }
  return res.json();
}

async function loadBlockContent(block) {
  if (!block) return '';
  const inline = block.data_content;
  if (typeof inline === 'string' && inline.trim()) return inline;
  const link = block.data_link;
  if (typeof link === 'string' && link.trim()) {
    const res = await fetch(link, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return '';
    return res.text();
  }
  return '';
}

function renderTranscript(content) {
  const raw = String(content || '').trim();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return raw;
    return parsed
      .map((seg) => {
        const speaker = seg?.speaker ? `${seg.speaker}: ` : '';
        return `${speaker}${seg?.content ?? seg?.topic ?? ''}`.trim();
      })
      .filter(Boolean)
      .join('\n');
  } catch {
    return raw;
  }
}

function actionItemsFromText(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/^[-*\u2022•]\s+|^\d+[.)]\s+/, '').trim())
    .filter((line) => line.length > 2 && line.length < 180);
}

function asFileList(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  return [];
}

function asFile(payload) {
  if (payload?.id && (payload.source_list || payload.note_list || payload.name)) return payload;
  if (payload?.data?.id) return payload.data;
  return payload;
}

async function noteFromFile(file) {
  const sourceList = Array.isArray(file.source_list) ? file.source_list : [];
  const noteList = Array.isArray(file.note_list) ? file.note_list : [];
  let transcript = '';
  for (const type of TRANSCRIPT_TYPES) {
    const source = sourceList.find((s) => s?.data_type === type);
    if (!source) continue;
    transcript = renderTranscript(await loadBlockContent(source));
    if (transcript) break;
  }
  const summaryNote = noteList.find((n) => n?.data_type === SUMMARY_TYPE) || noteList[0];
  const summary = String(await loadBlockContent(summaryNote)).trim();
  const actionItems = actionItemsFromText(summary).slice(0, 8);
  if (!transcript && !summary) return null;
  return {
    id: `plaud-${file.id}`,
    title: String(file.name || 'Plaud Note').trim() || 'Plaud Note',
    transcript,
    summary,
    actionItems,
    recordedAt: String(file.start_at || file.created_at || new Date().toISOString()),
  };
}

export async function syncPlaudFromAccount() {
  const refresh = await resolvePlaudRefreshToken();
  if (!refresh) {
    return { ok: false, connected: false, imported: 0, skipped: 0, error: 'not-connected' };
  }

  const started = Date.now();
  let accessToken;
  try {
    accessToken = (await refreshAccessToken(refresh)).accessToken;
  } catch {
    return { ok: false, connected: false, imported: 0, skipped: 0, error: 'login-expired' };
  }

  const listed = await plaudRequest(
    `/open/third-party/files/?page=1&page_size=${LIST_PAGE_SIZE}`,
    accessToken,
  );
  const files = asFileList(listed);
  let imported = 0;
  let skipped = 0;
  let pending = 0;

  for (const item of files) {
    if (Date.now() - started > BUDGET_MS || imported >= MAX_IMPORT) break;
    const fileId = String(item?.id || '').trim();
    if (!fileId) continue;
    const noteId = `plaud-${fileId}`;
    if (await fetchPlaudNote(noteId)) {
      skipped += 1;
      continue;
    }
    let detail;
    try {
      detail = asFile(await plaudRequest(`/open/third-party/files/${fileId}`, accessToken));
    } catch {
      pending += 1;
      continue;
    }
    const parsed = await noteFromFile(detail || item);
    if (!parsed) {
      pending += 1;
      continue;
    }
    await insertPlaudNote(parsed);
    imported += 1;
  }

  return {
    ok: true,
    connected: true,
    imported,
    skipped,
    pending,
  };
}
