import { getBcConfigStatus, isBcConfigured, syncFromBusinessCentral } from './businessCentralApi.js';

export default async function apiBcSyncHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const status = getBcConfigStatus();
    return res.status(200).json({
      ...status,
      message: status.configured
        ? 'Business Central API ist konfiguriert. Manuelle Synchronisation möglich.'
        : 'Business Central nicht konfiguriert – Umgebungsvariablen in Vercel setzen.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isBcConfigured()) {
    return res.status(503).json({
      configured: false,
      error: 'BC nicht konfiguriert',
      setupRequired: true,
    });
  }

  try {
    const localCustomers = Array.isArray(req.body?.customers) ? req.body.customers : [];
    const result = await syncFromBusinessCentral(localCustomers);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      configured: true,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler',
    });
  }
}
