/** Vercel proxy – HILMA Finnland AVP search (HILMA_API_KEY) */
const TARGET = 'https://api.hankintailmoitukset.fi/avp/eformnotices/docs/search';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.HILMA_API_KEY;
  if (!apiKey) {
    console.warn('[api/hilma] HILMA_API_KEY nicht gesetzt');
    return res.status(200).json({ value: [], '@odata.count': 0 });
  }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const response = await fetch(TARGET, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'PHT-Mastertool/1.0',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      body,
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
