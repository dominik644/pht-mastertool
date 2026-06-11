/** Vercel proxy – TenderNed Atom-RSS (öffentlich, kein Key) */
const TARGET = 'https://www.tenderned.nl/papi/tenderned-rs-tns/rss/laatste-publicatie.rss';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(TARGET, {
      headers: { 'User-Agent': 'PHT-Mastertool/1.0', Accept: 'application/atom+xml, application/xml' },
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
