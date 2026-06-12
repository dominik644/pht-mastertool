/** Vercel proxy — UK tender APIs (contracts, find-tender, cf-ocds) */
const ROUTES = {
  contracts: {
    method: 'POST',
    target: 'https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json',
    buildUrl: () => null,
  },
  'find-tender': {
    method: 'GET',
    target: 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages',
    defaultQs: '?limit=80&stages=tender',
  },
  'cf-ocds': {
    method: 'GET',
    target: 'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search',
    defaultQs: '?limit=60&stages=tender',
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const targetKey = req.query?.target;
  const route = ROUTES[targetKey];
  if (!route) return res.status(404).json({ error: 'Unknown UK proxy target' });
  if (req.method !== route.method) return res.status(405).json({ error: 'Method not allowed' });

  try {
    let response;
    if (targetKey === 'contracts') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      response = await fetch(route.target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body,
      });
    } else {
      const qs = req.url?.includes('?')
        ? req.url.slice(req.url.indexOf('?')).replace(/^\?target=[^&]+&?/, '?').replace(/^\?$/, '')
        : '';
      const query = qs && qs !== '?' ? qs : route.defaultQs;
      const url = query.startsWith('?') ? `${route.target}${query}` : `${route.target}?${query}`;
      response = await fetch(url, { headers: { Accept: 'application/json' } });
    }
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
