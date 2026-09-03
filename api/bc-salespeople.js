import {
  fetchSalesTeamOverview,
  getBcConfigStatus,
  isBcConfigured,
} from '../lib/businessCentralApi.js';
import { guardAppAuth } from '../lib/appAuth.js';

/**
 * READ ONLY – Verkäufer aus Business Central inkl. Kunden-Zuordnung & Gebiet.
 * GET /api/bc-salespeople
 */
export default async function handler(req, res) {
  const guard = guardAppAuth(req, res);
  if (!guard.ok) return;

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
