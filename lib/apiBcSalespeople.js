import {
  fetchSalesTeamOverview,
  getBcConfigStatus,
  isBcConfigured,
} from './businessCentralApi.js';

/** READ ONLY – Verkäufer aus Business Central inkl. Kunden-Zuordnung & Gebiet. */
export default async function apiBcSalespeopleHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isBcConfigured()) {
    return res.status(200).json({
      ...getBcConfigStatus(),
      configured: false,
      setupRequired: true,
      salespeople: [],
    });
  }

  try {
    const result = await fetchSalesTeamOverview();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      configured: true,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler',
      salespeople: [],
    });
  }
}
