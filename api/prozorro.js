/** Vercel proxy – Ukraine Prozorro API */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const path = (req.url || '').replace(/^\/api\/prozorro/, '') || '/tenders?limit=25&descending=1';
    const target = `https://public-api.prozorro.gov.ua/api/2.5${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetch(target, { headers: { Accept: 'application/json' } });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
