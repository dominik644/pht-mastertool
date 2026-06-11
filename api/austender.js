/** Vercel proxy – AusTender OCDS API (öffentlich, kein Key) */
const BASE = 'https://api.tenders.gov.au/ocds';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rawPath = (req.url || '').split('?')[0];
    const ocdsPath = rawPath.replace(/^\/api\/austender/, '') || '';
    const qs = (req.url || '').includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const response = await fetch(`${BASE}${ocdsPath}${qs}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
