import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';

/** @type {Map<string, object> | null} */
let memoryCache = null;

function getStorePath() {
  if (process.env.VERCEL === '1') {
    return '/tmp/schedule-proposals.json';
  }
  return join(process.cwd(), 'data', 'schedule-proposals.json');
}

function ensureMemoryCache() {
  if (!memoryCache) memoryCache = new Map();
  return memoryCache;
}

function readAllFromFile() {
  const path = getStorePath();
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllToFile(map) {
  const path = getStorePath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(map, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function readAll() {
  const mem = ensureMemoryCache();
  if (mem.size > 0) {
    return Object.fromEntries(mem);
  }
  const fromFile = readAllFromFile();
  for (const [id, row] of Object.entries(fromFile)) {
    mem.set(id, row);
  }
  return fromFile;
}

function writeRow(id, row) {
  const mem = ensureMemoryCache();
  mem.set(id, row);
  const all = readAllFromFile();
  all[id] = row;
  writeAllToFile(all);
}

export function hasFileScheduleProposalStorage() {
  if (process.env.VERCEL === '1') {
    return true;
  }
  try {
    const path = getStorePath();
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {object} proposal
 */
export async function insertFileScheduleProposal(proposal) {
  if (!hasFileScheduleProposalStorage()) {
    return { ok: false, skipped: true, error: 'Datei-Speicher nicht verfügbar' };
  }
  try {
    const row = {
      ...proposal,
      created_at: proposal.created_at ?? new Date().toISOString(),
    };
    writeRow(proposal.id, row);
    return { ok: true, row };
  } catch (err) {
    return { ok: false, error: err.message || 'Proposal speichern fehlgeschlagen' };
  }
}

/**
 * @param {string} proposalId
 */
export async function fetchFileScheduleProposal(proposalId) {
  if (!hasFileScheduleProposalStorage()) {
    return { ok: false, skipped: true };
  }
  const all = readAll();
  const row = all[proposalId];
  if (!row) return { ok: false, error: 'Vorschlag nicht gefunden' };
  return { ok: true, proposal: row };
}

/**
 * @param {string} proposalId
 * @param {object} patch
 */
export async function updateFileScheduleProposal(proposalId, patch) {
  if (!hasFileScheduleProposalStorage()) {
    return { ok: false, skipped: true };
  }
  const all = readAll();
  const existing = all[proposalId];
  if (!existing) return { ok: false, error: 'Vorschlag nicht gefunden' };
  const updated = { ...existing, ...patch };
  writeRow(proposalId, updated);
  return { ok: true };
}
