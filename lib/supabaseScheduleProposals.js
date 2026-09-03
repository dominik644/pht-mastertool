import {
  fetchFileScheduleProposal,
  hasFileScheduleProposalStorage,
  insertFileScheduleProposal,
  updateFileScheduleProposal,
} from './fileScheduleProposals.js';
import { hasSupabaseSalesConfig } from './supabaseSalesSync.js';

function normalizeSupabaseUrl(raw) {
  if (!raw) return null;
  return raw.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');
}

function getConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export function hasScheduleProposalStorage() {
  return hasSupabaseSalesConfig() || hasFileScheduleProposalStorage();
}

export function scheduleProposalStorageMode() {
  if (hasSupabaseSalesConfig()) return 'supabase';
  if (hasFileScheduleProposalStorage()) return 'file';
  return 'none';
}

/**
 * @param {object} proposal
 */
export async function insertScheduleProposal(proposal) {
  const cfg = getConfig();
  if (!cfg) return insertFileScheduleProposal(proposal);

  try {
    const res = await fetch(`${cfg.url}/rest/v1/schedule_proposals`, {
      method: 'POST',
      headers: headers(cfg.key, { Prefer: 'return=representation' }),
      body: JSON.stringify(proposal),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
    }
    const rows = await res.json();
    return { ok: true, row: Array.isArray(rows) ? rows[0] : rows };
  } catch (err) {
    return { ok: false, error: err.message || 'Proposal speichern fehlgeschlagen' };
  }
}

/**
 * @param {string} proposalId
 */
export async function fetchScheduleProposal(proposalId) {
  const cfg = getConfig();
  if (!cfg) return fetchFileScheduleProposal(proposalId);

  try {
    const params = new URLSearchParams({ select: '*', id: `eq.${proposalId}` });
    const res = await fetch(`${cfg.url}/rest/v1/schedule_proposals?${params}`, {
      headers: headers(cfg.key),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
    }
    const rows = await res.json();
    const row = rows?.[0];
    if (!row) return { ok: false, error: 'Vorschlag nicht gefunden' };
    return { ok: true, proposal: row };
  } catch (err) {
    return { ok: false, error: err.message || 'Proposal lesen fehlgeschlagen' };
  }
}

/**
 * @param {string} proposalId
 * @param {object} patch
 */
export async function updateScheduleProposal(proposalId, patch) {
  const cfg = getConfig();
  if (!cfg) return updateFileScheduleProposal(proposalId, patch);

  try {
    const params = new URLSearchParams({ id: `eq.${proposalId}` });
    const res = await fetch(`${cfg.url}/rest/v1/schedule_proposals?${params}`, {
      method: 'PATCH',
      headers: headers(cfg.key, { Prefer: 'return=minimal' }),
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Proposal aktualisieren fehlgeschlagen' };
  }
}
