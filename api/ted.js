/**
 * Vercel Serverless Proxy für TED API v3 (CORS-Umgehung)
 */
const TED_API_URL = 'https://api.ted.europa.eu/v3/notices/search';

const DEFAULT_BODY = {
  query: 'FT~(hygiene OR cleaning OR hospital OR sanitation OR disinfection OR reinigung OR desinfektion)',
  fields: [
    'notice-title',
    'publication-number',
    'publication-date',
    'organisation-country-buyer',
    'place-of-performance-country-proc',
    'deadline-receipt-tender-date-lot',
    'description-glo',
    'estimated-value-lot',
    'classification-cpv',
    'links',
  ],
  limit: 50,
  scope: 'ACTIVE',
  page: 1,
  paginationMode: 'PAGE_NUMBER',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const body = { ...DEFAULT_BODY, ...clientBody };

    const response = await fetch(TED_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy error';
    return res.status(502).json({ error: message });
  }
}
