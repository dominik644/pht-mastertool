/** Vercel proxy – service.bund.de Ausschreibungs-RSS */
const TARGET = 'https://www.service.bund.de/Content/Globals/Functions/RSSFeed/RSSGenerator_Ausschreibungen.xml';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(TARGET, {
      headers: { 'User-Agent': 'PHT-Mastertool/1.0', Accept: 'application/rss+xml, application/xml' },
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
