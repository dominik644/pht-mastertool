import { sendServerEmail, hasServerMailConfig } from './microsoftMailServer.js';

/**
 * POST /api/schedule-send
 * Body: { to, subject, body, attachments?: { name, contentType, contentBytes }[] }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ configured: hasServerMailConfig() });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!hasServerMailConfig()) {
    return res.status(503).json({ ok: false, error: 'Microsoft Graph Mail nicht konfiguriert' });
  }

  const { to, subject, body, html, attachments } = req.body ?? {};
  if (!to || !subject || (!body && !html)) {
    return res.status(400).json({ error: 'to, subject und body/html erforderlich' });
  }

  const attList = Array.isArray(attachments)
    ? attachments.slice(0, 3).filter((a) => a?.name && a?.contentBytes)
    : [];

  const result = await sendServerEmail({
    to: String(to).trim(),
    subject: String(subject),
    body: String(body ?? ''),
    html: html ? String(html) : undefined,
    attachments: attList,
  });

  if (!result.ok) {
    return res.status(result.skipped ? 503 : 502).json({
      ok: false,
      error: result.error ?? 'Versand fehlgeschlagen',
    });
  }

  return res.status(200).json({ ok: true });
}
