import { guardAppAuth } from '../lib/appAuth.js';
import {
  extractPlaudNote,
  fetchPlaudNote,
  insertPlaudNote,
  isPlaudWebhookAuthorized,
  listPlaudNotes,
  listPendingPlaudNotes,
  plaudPublicBase,
  updatePlaudNoteStatus,
} from '../lib/plaudInbox.js';

function callbackUri(req, note) {
  return `${plaudPublicBase(req)}/plaud?note=${encodeURIComponent(note.id)}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Plaud-Secret');

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

  if (req.method === 'POST') {
    if (!isPlaudWebhookAuthorized(req)) {
      return res.status(401).json({ error: 'Ungültiger Plaud-Schlüssel' });
    }
    const parsed = extractPlaudNote(req.body ?? {});
    if (!parsed) {
      return res.status(400).json({
        error: 'Keine Notizdaten',
        message: 'Titel, Transkript oder Summary fehlt. Zapier/Plaud-Payload als JSON senden.',
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
    });
  }

  const cookie = String(req.headers?.cookie || '');
  const plaudProbe = isPlaudWebhookAuthorized(req) && !cookie.includes('pht_session');
  if (req.method === 'GET' && plaudProbe) {
    return res.status(200).json({
      ok: true,
      message: 'Plaud-API bereit. Notizen bitte per POST (Zapier Webhook) senden.',
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
