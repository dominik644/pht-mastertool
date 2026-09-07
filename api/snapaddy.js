import { guardAppAuth } from '../lib/appAuth.js';
import {
  fetchSnapaddyCard,
  insertSnapaddyCard,
  isSnapaddyWebhookAuthorized,
  listPendingSnapaddyCards,
  normalizeSnapaddyPayload,
  snapaddyPublicBase,
  updateSnapaddyCardStatus,
} from '../lib/snapaddyInbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Snapaddy-Secret');

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

  if (req.method === 'POST') {
    if (!isSnapaddyWebhookAuthorized(req)) {
      return res.status(401).json({ error: 'Ungültiger Snapaddy-Schlüssel' });
    }
    const normalized = normalizeSnapaddyPayload(req.body ?? {});
    if (!normalized.company && !normalized.fullName && !normalized.email) {
      return res.status(400).json({
        error: 'Keine Kontaktdaten',
        message: 'Firma, Name oder E-Mail fehlt.',
      });
    }
    const card = insertSnapaddyCard(normalized);
    const packed = Buffer.from(JSON.stringify(card)).toString('base64url');
    const uri = `${snapaddyPublicBase(req)}/priorities?snapaddy=${encodeURIComponent(card.id)}&card=${packed}`;
    return res.status(200).json({ ok: true, id: card.id, uri });
  }

  const guard = guardAppAuth(req, res);
  if (!guard.ok) return;

  if (req.method === 'GET') {
    const id = req.query?.id;
    if (id) {
      const card = fetchSnapaddyCard(String(id));
      if (!card) return res.status(404).json({ error: 'Visitenkarte nicht gefunden' });
      return res.status(200).json({ ok: true, card });
    }
    return res.status(200).json({ ok: true, cards: listPendingSnapaddyCards() });
  }

  if (req.method === 'PATCH') {
    const id = req.body?.id;
    const status = req.body?.status;
    if (!id || (status !== 'applied' && status !== 'dismissed')) {
      return res.status(400).json({ error: 'id und status (applied|dismissed) erforderlich' });
    }
    const updated = updateSnapaddyCardStatus(String(id), status);
    if (!updated) return res.status(404).json({ error: 'Visitenkarte nicht gefunden' });
    return res.status(200).json({ ok: true, card: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
