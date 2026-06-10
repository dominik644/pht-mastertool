/** Vercel proxy – South Africa eTenders OCDS API */
const BASE = 'https://ocds-api.etenders.gov.za/api/OCDSReleases';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const response = await fetch(`${BASE}${qs}`, { headers: { Accept: 'application/json' } });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
