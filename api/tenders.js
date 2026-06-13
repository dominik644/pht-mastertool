/**
 * Consolidated Vercel proxy for tender data sources (1 serverless function).
 * Invoked via rewrites: /api/tenders/{source} → /api/tenders?source={source}&rest=…
 */

const SOURCES = {
  bund: {
    method: 'GET',
    target: 'https://www.service.bund.de/Content/Globals/Functions/RSSFeed/RSSGenerator_Ausschreibungen.xml',
    accept: 'application/rss+xml, application/xml',
    contentType: 'application/rss+xml; charset=utf-8',
  },
  tenderned: {
    method: 'GET',
    target: 'https://www.tenderned.nl/papi/tenderned-rs-tns/rss/laatste-publicatie.rss',
    accept: 'application/atom+xml, application/xml',
    contentType: 'application/atom+xml; charset=utf-8',
  },
  bbg: {
    method: 'GET',
    target: 'https://www.bbg.gv.at/information/aktuelle-ausschreibungen',
    accept: 'text/html',
    contentType: 'text/html; charset=utf-8',
  },
  simap: {
    method: 'GET',
    target: 'https://www.simap.ch/api/publications/v2/project/project-search',
    accept: 'application/json',
    contentType: 'application/json',
    passQuery: true,
  },
  doffin: {
    method: 'GET',
    target: 'https://betaapi.doffin.no/public/v2/search',
    accept: 'application/json',
    contentType: 'application/json',
    passQuery: true,
    apiKeyEnv: 'DOFFIN_API_KEY',
    emptyResponse: { hits: [], numHitsTotal: 0, numHitsAccessible: 0 },
  },
  hilma: {
    method: 'POST',
    target: 'https://api.hankintailmoitukset.fi/avp/eformnotices/docs/search',
    accept: 'application/json',
    contentType: 'application/json',
    apiKeyEnv: 'HILMA_API_KEY',
    emptyResponse: { value: [], '@odata.count': 0 },
  },
  austender: {
    method: 'GET',
    base: 'https://api.tenders.gov.au/ocds',
    accept: 'application/json',
    contentType: 'application/json',
  },
  prozorro: {
    method: 'GET',
    base: 'https://public-api.prozorro.gov.ua/api/2.5',
    accept: 'application/json',
    contentType: 'application/json',
    defaultPath: '/tenders?limit=25&descending=1',
  },
  'za-etenders': {
    method: 'GET',
    base: 'https://ocds-api.etenders.gov.za/api/OCDSReleases',
    accept: 'application/json',
    contentType: 'application/json',
  },
  boamp: {
    method: 'GET',
    target:
      'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
    accept: 'application/json',
    contentType: 'application/json',
    passQuery: true,
  },
  ezamowienia: {
    method: 'GET',
    target: 'https://ezamowienia.gov.pl/mo-board/api/v1/notice',
    accept: 'application/json',
    contentType: 'application/json',
    passQuery: true,
  },
};

function setCors(res, methods) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', `${methods}, OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function extraQuery(req) {
  const params = new URLSearchParams(req.query);
  params.delete('source');
  params.delete('rest');
  const qs = params.toString();
  return qs;
}

function buildPathUrl(req, config, restPath) {
  const path = restPath ? `/${restPath}` : (config.defaultPath || '');
  const qs = extraQuery(req);
  const base = `${config.base}${path.startsWith('/') ? path : `/${path}`}`;
  return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;
}

async function forward(req, res, config, source) {
  const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : null;
  if (config.apiKeyEnv && !apiKey) {
    console.warn(`[api/tenders] ${config.apiKeyEnv} nicht gesetzt (${source})`);
    return res.status(200).json(config.emptyResponse ?? {});
  }

  const restPath = req.query?.rest ? String(req.query.rest) : '';
  let url;
  if (config.base) {
    url = buildPathUrl(req, config, restPath);
  } else if (config.passQuery) {
    const qs = extraQuery(req);
    url = qs ? `${config.target}?${qs}` : config.target;
  } else {
    url = config.target;
  }

  const headers = {
    Accept: config.accept,
    'User-Agent': 'PHT-Mastertool/1.0',
  };
  if (apiKey) headers['Ocp-Apim-Subscription-Key'] = apiKey;

  const init = { method: config.method, headers };
  if (config.method === 'POST') {
    headers['Content-Type'] = 'application/json';
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  }

  const response = await fetch(url, init);
  const text = await response.text();
  if (source === 'doffin' && (response.status === 401 || response.status === 403)) {
    console.warn(
      '[api/tenders] Doffin 401/403 – DOFFIN_API_KEY ungültig oder falsches Produkt. ' +
        'Abonnement „Public API“ im Portal aktivieren: https://dof-notices-prod-api.developer.azure-api.net/',
    );
  }
  res.status(response.status).setHeader('Content-Type', config.contentType);
  return res.send(text);
}

export default async function handler(req, res) {
  const source = req.query?.source;
  const config = source ? SOURCES[source] : null;

  const methods = config ? config.method : 'GET, POST';
  setCors(res, methods);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!config) return res.status(404).json({ error: 'Unknown tender source' });
  if (req.method !== config.method) return res.status(405).json({ error: 'Method not allowed' });

  try {
    return await forward(req, res, config, source);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
