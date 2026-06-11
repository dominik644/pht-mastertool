/** Vercel proxy – Doffin Norwegen Public API v2 (DOFFIN_API_KEY) */
const TARGET = 'https://betaapi.doffin.no/public/v2/search';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DOFFIN_API_KEY;
  if (!apiKey) {
    console.warn('[api/doffin] DOFFIN_API_KEY nicht gesetzt');
    return res.status(200).json({ hits: [], numHitsTotal: 0, numHitsAccessible: 0 });
  }

  try {
    const qs = new URLSearchParams(req.query).toString();
    const url = qs ? `${TARGET}?${qs}` : TARGET;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PHT-Mastertool/1.0',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
