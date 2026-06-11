/** Vercel proxy – SIMAP Schweiz Projekt-Suche */
const TARGET = 'https://www.simap.ch/api/publications/v2/project/project-search';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const qs = new URLSearchParams(req.query).toString();
    const url = qs ? `${TARGET}?${qs}` : TARGET;
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
