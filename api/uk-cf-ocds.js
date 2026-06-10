/** Vercel proxy – UK Contracts Finder OCDS Search */
const BASE = 'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '?limit=60&stages=tender';
    const response = await fetch(`${BASE}${qs}`, { headers: { Accept: 'application/json' } });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
