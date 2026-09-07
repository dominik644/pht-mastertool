import { guardAppAuth } from '../lib/appAuth.js';
import {
  extractSnapaddyContacts,
  fetchSnapaddyCard,
  insertSnapaddyCard,
  isSnapaddyWebhookAuthorized,
  listPendingSnapaddyCards,
  snapaddyPublicBase,
  updateSnapaddyCardStatus,
} from '../lib/snapaddyInbox.js';

function callbackUri(req, card) {
  const packed = Buffer.from(JSON.stringify(card)).toString('base64url');
  return `${snapaddyPublicBase(req)}/priorities?snapaddy=${encodeURIComponent(card.id)}&card=${packed}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Snapaddy-Secret');

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

  if (req.method === 'POST') {
    if (!isSnapaddyWebhookAuthorized(req)) {
      return res.status(401).json({ error: 'Ungültiger Snapaddy-Schlüssel' });
    }
    const contacts = extractSnapaddyContacts(req.body ?? {});
    if (!contacts.length) {
      return res.status(400).json({
        error: 'Keine Kontaktdaten',
        message: 'Firma, Name oder E-Mail fehlt. Bitte POST mit JSON oder vCard senden.',
      });
    }
    const cards = [];
    for (const contact of contacts) {
      cards.push(await insertSnapaddyCard(contact));
    }
    const primary = cards[0];
    const uri = callbackUri(req, primary);
    return res.status(200).json({
      ok: true,
      id: primary.id,
      ids: cards.map((c) => c.id),
      uri,
      callbackUrl: uri,
    });
  }

  const cookie = String(req.headers?.cookie || '');
  const snapaddyProbe = isSnapaddyWebhookAuthorized(req) && !cookie.includes('pht_session');
  if (req.method === 'GET' && snapaddyProbe) {
    return res.status(200).json({
      ok: true,
      message: 'Snapaddy-API bereit. Export bitte per POST (nicht GET) senden.',
    });
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
    return res.status(200).json({ ok: true, cards: await listPendingSnapaddyCards() });
  }

  if (req.method === 'PATCH') {
    const id = req.body?.id;
    const status = req.body?.status;
    if (!id || (status !== 'applied' && status !== 'dismissed')) {
      return res.status(400).json({ error: 'id und status (applied|dismissed) erforderlich' });
    }
    const updated = await updateSnapaddyCardStatus(String(id), status);
    if (!updated) return res.status(404).json({ error: 'Visitenkarte nicht gefunden' });
    return res.status(200).json({ ok: true, card: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
