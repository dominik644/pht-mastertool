import {
  fetchFileScheduleProposal,
  hasFileScheduleProposalStorage,
  insertFileScheduleProposal,
  listFileScheduleProposalsByStatus,
  updateFileScheduleProposal,
} from './fileScheduleProposals.js';

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

/** After a 404 / missing table, skip Supabase for the rest of this process. */
let supabaseProposalsDisabled = false;

function isSupabaseProposalsForcedOff() {
  const v = process.env.SCHEDULE_PROPOSALS_SUPABASE ?? process.env.SCHEDULE_USE_SUPABASE;
  return v === '0' || v === 'false' || v === 'off' || v === 'no';
}

function shouldUseSupabase() {
  if (isSupabaseProposalsForcedOff()) return false;
  if (supabaseProposalsDisabled) return false;
  return Boolean(getConfig());
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function isSupabaseTableMissing(status, text) {
  if (status === 404) return true;
  const body = String(text ?? '');
  return /schedule_proposals|PGRST205|relation.*does not exist|Could not find the table/i.test(body);
}

function disableSupabaseProposals(reason) {
  supabaseProposalsDisabled = true;
  console.warn(`[schedule-proposals] Supabase übersprungen (${reason}) – Datei-Speicher aktiv`);
}

const FRIENDLY_STORAGE_ERROR =
  'Terminvorschlag konnte nicht gespeichert werden. Bitte erneut versuchen.';

/**
 * @param {() => Promise<{ ok: boolean, error?: string, skipped?: boolean, row?: object, proposal?: object }>} supabaseOp
 * @param {() => Promise<{ ok: boolean, error?: string, skipped?: boolean, row?: object, proposal?: object }>} fileOp
 */
async function withStorageFallback(supabaseOp, fileOp) {
  if (!shouldUseSupabase()) return fileOp();

  const result = await supabaseOp();
  if (result.ok) return result;

  if (result.fallback) {
    disableSupabaseProposals(result.fallbackReason ?? 'Tabelle fehlt');
    return fileOp();
  }

  if (hasFileScheduleProposalStorage()) {
    console.warn('[schedule-proposals] Supabase-Fehler, versuche Datei-Speicher');
    const fileResult = await fileOp();
    if (fileResult.ok) return fileResult;
  }

  return { ok: false, error: FRIENDLY_STORAGE_ERROR };
}

export function hasScheduleProposalStorage() {
  return hasFileScheduleProposalStorage() || Boolean(getConfig());
}

export function scheduleProposalStorageMode() {
  if (shouldUseSupabase()) return 'supabase';
  if (hasFileScheduleProposalStorage()) return 'file';
  return 'none';
}

/**
 * @param {object} proposal
 */
export async function insertScheduleProposal(proposal) {
  return withStorageFallback(
    async () => {
      const cfg = getConfig();
      if (!cfg) return { ok: false, fallback: true, fallbackReason: 'nicht konfiguriert' };

      try {
        const res = await fetch(`${cfg.url}/rest/v1/schedule_proposals`, {
          method: 'POST',
          headers: headers(cfg.key, { Prefer: 'return=representation' }),
          body: JSON.stringify(proposal),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          const text = await res.text();
          if (isSupabaseTableMissing(res.status, text)) {
            return { ok: false, fallback: true, fallbackReason: `${res.status}` };
          }
          return { ok: false, error: FRIENDLY_STORAGE_ERROR };
        }
        const rows = await res.json();
        return { ok: true, row: Array.isArray(rows) ? rows[0] : rows };
      } catch (err) {
        return { ok: false, fallback: true, fallbackReason: err.message || 'Netzwerk' };
      }
    },
    () => insertFileScheduleProposal(proposal),
  );
}

/**
 * @param {string} proposalId
 */
export async function fetchScheduleProposal(proposalId) {
  return withStorageFallback(
    async () => {
      const cfg = getConfig();
      if (!cfg) return { ok: false, fallback: true, fallbackReason: 'nicht konfiguriert' };

      try {
        const params = new URLSearchParams({ select: '*', id: `eq.${proposalId}` });
        const res = await fetch(`${cfg.url}/rest/v1/schedule_proposals?${params}`, {
          headers: headers(cfg.key),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          const text = await res.text();
          if (isSupabaseTableMissing(res.status, text)) {
            return { ok: false, fallback: true, fallbackReason: `${res.status}` };
          }
          return { ok: false, error: 'Terminvorschlag konnte nicht geladen werden.' };
        }
        const rows = await res.json();
        const row = rows?.[0];
        if (!row) return { ok: false, error: 'Vorschlag nicht gefunden' };
        return { ok: true, proposal: row };
      } catch (err) {
        return { ok: false, fallback: true, fallbackReason: err.message || 'Netzwerk' };
      }
    },
    () => fetchFileScheduleProposal(proposalId),
  );
}

/**
 * @param {string} proposalId
 * @param {object} patch
 */
export async function updateScheduleProposal(proposalId, patch) {
  return withStorageFallback(
    async () => {
      const cfg = getConfig();
      if (!cfg) return { ok: false, fallback: true, fallbackReason: 'nicht konfiguriert' };

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
          if (isSupabaseTableMissing(res.status, text)) {
            return { ok: false, fallback: true, fallbackReason: `${res.status}` };
          }
          return { ok: false, error: 'Terminvorschlag konnte nicht aktualisiert werden.' };
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, fallback: true, fallbackReason: err.message || 'Netzwerk' };
      }
    },
    () => updateFileScheduleProposal(proposalId, patch),
  );
}

/**
 * @param {string} status
 */
export async function fetchScheduleProposalsByStatus(status) {
  return withStorageFallback(
    async () => {
      const cfg = getConfig();
      if (!cfg) return { ok: false, fallback: true, fallbackReason: 'nicht konfiguriert' };

      try {
        const params = new URLSearchParams({ select: '*', status: `eq.${status}`, order: 'created_at.desc' });
        const res = await fetch(`${cfg.url}/rest/v1/schedule_proposals?${params}`, {
          headers: headers(cfg.key),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          const text = await res.text();
          if (isSupabaseTableMissing(res.status, text)) {
            return { ok: false, fallback: true, fallbackReason: `${res.status}` };
          }
          return { ok: false, error: 'Anfragen konnten nicht geladen werden.' };
        }
        const rows = await res.json();
        return { ok: true, proposals: Array.isArray(rows) ? rows : [] };
      } catch (err) {
        return { ok: false, fallback: true, fallbackReason: err.message || 'Netzwerk' };
      }
    },
    () => listFileScheduleProposalsByStatus(status),
  );
}
