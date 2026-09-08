import { guardAppAuth } from './appAuth.js';
import {
  extractPlaudNote,
  fetchPlaudNote,
  insertPlaudNote,
  isPlaudWebhookAuthorized,
  listPlaudNotes,
  listPendingPlaudNotes,
  plaudPublicBase,
  updatePlaudNoteStatus,
} from './plaudInbox.js';
import {
  plaudAccountStatus,
  storePlaudRefreshToken,
  syncPlaudFromAccount,
} from './plaudPull.js';

function callbackUri(req, note) {
  return `${plaudPublicBase(req)}/plaud?note=${encodeURIComponent(note.id)}`;
}

async function handleAccountAction(req, res) {
  const action = String(req.body?.action || req.query?.action || '').trim();
  if (req.method === 'GET' && String(req.query?.account || '') === '1') {
    const status = await plaudAccountStatus();
    return res.status(200).json({ ok: true, ...status });
  }
  if (action === 'status') {
    const status = await plaudAccountStatus();
    return res.status(200).json({ ok: true, ...status });
  }
  if (action === 'connect') {
    const token = String(req.body?.refreshToken || req.body?.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token fehlt' });
    await storePlaudRefreshToken(token);
    const status = await plaudAccountStatus();
    return res.status(200).json({ ok: true, connected: status.connected, expired: status.expired || false });
  }
  if (action === 'sync' || String(req.query?.sync || '') === '1') {
    const result = await syncPlaudFromAccount();
    if (result.error === 'not-connected') {
      return res.status(412).json({ ok: false, ...result });
    }
    if (result.error === 'login-expired') {
      return res.status(401).json({ ok: false, ...result, error: 'Plaud-Login abgelaufen' });
    }
    return res.status(200).json(result);
  }
  return res.status(400).json({ error: 'Unbekannte Aktion' });
}

export async function handlePlaud(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Plaud-Secret');

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

  const accountAction = String(req.body?.action || req.query?.action || '').trim();
  const wantsAccount = accountAction === 'sync'
    || accountAction === 'connect'
    || accountAction === 'status'
    || String(req.query?.account || '') === '1'
    || String(req.query?.sync || '') === '1';

  if (wantsAccount) {
    const guard = guardAppAuth(req, res);
    if (!guard.ok) return;
    return handleAccountAction(req, res);
  }

  if (req.method === 'POST') {
    if (!isPlaudWebhookAuthorized(req)) {
      return res.status(401).json({ error: 'Ungültiger Plaud-Schlüssel' });
    }
    const parsed = extractPlaudNote(req.body ?? {});
    if (!parsed) {
      return res.status(400).json({
        error: 'Keine Notizdaten',
        message: 'Titel, Transkript oder Summary fehlt.',
      });
    }
    const note = await insertPlaudNote(parsed);
    const uri = callbackUri(req, note);
    return res.status(200).json({
      ok: true,
      id: note.id,
      uri,
      callbackUrl: uri,
      title: note.title,
      persisted: Boolean(note.persisted),
      persistError: note.persistError || null,
    });
  }

  const cookie = String(req.headers?.cookie || '');
  const plaudProbe = isPlaudWebhookAuthorized(req) && !cookie.includes('pht_session');
  if (req.method === 'GET' && plaudProbe) {
    return res.status(200).json({
      ok: true,
      message: 'Plaud-API bereit.',
    });
  }

  const guard = guardAppAuth(req, res);
  if (!guard.ok) return;

  if (req.method === 'GET') {
    const id = req.query?.id;
    if (id) {
      const note = await fetchPlaudNote(String(id));
      if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden' });
      return res.status(200).json({ ok: true, note });
    }
    if (req.query?.all === '1') {
      return res.status(200).json({ ok: true, notes: await listPlaudNotes() });
    }
    return res.status(200).json({ ok: true, notes: await listPendingPlaudNotes() });
  }

  if (req.method === 'PATCH') {
    const id = req.body?.id;
    const status = req.body?.status;
    if (!id || (status !== 'applied' && status !== 'dismissed' && status !== 'pending')) {
      return res.status(400).json({ error: 'id und status (pending|applied|dismissed) erforderlich' });
    }
    const updated = await updatePlaudNoteStatus(String(id), status);
    if (!updated) return res.status(404).json({ error: 'Notiz nicht gefunden' });
    return res.status(200).json({ ok: true, note: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
