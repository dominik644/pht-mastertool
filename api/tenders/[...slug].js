/**
 * Consolidated Vercel proxy for tender data sources (counts as 1 serverless function).
 * Routes: /api/tenders/{source}[/{path...}]
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
    pathPrefix: 'austender',
  },
  prozorro: {
    method: 'GET',
    base: 'https://public-api.prozorro.gov.ua/api/2.5',
    accept: 'application/json',
    contentType: 'application/json',
    pathPrefix: 'prozorro',
    defaultPath: '/tenders?limit=25&descending=1',
  },
  'za-etenders': {
    method: 'GET',
    base: 'https://ocds-api.etenders.gov.za/api/OCDSReleases',
    accept: 'application/json',
    contentType: 'application/json',
    pathPrefix: 'za-etenders',
  },
};

function setCors(res, methods) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', `${methods}, OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseSlug(req) {
  const raw = req.query?.slug;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function buildPathUrl(req, config, slugParts) {
  const prefix = config.pathPrefix;
  const rest = slugParts[0] === prefix ? slugParts.slice(1) : slugParts;
  const path = rest.length ? `/${rest.join('/')}` : (config.defaultPath || '');
  const qs = reqQueryWithoutSlug(req);
  const base = `${config.base}${path.startsWith('/') ? path : `/${path}`}`;
  return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;
}

function reqQueryWithoutSlug(req) {
  const params = new URLSearchParams(req.query);
  params.delete('slug');
  const qs = params.toString();
  return qs;
}

async function forward(req, res, config, slugParts) {
  const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : null;
  if (config.apiKeyEnv && !apiKey) {
    console.warn(`[api/tenders] ${config.apiKeyEnv} nicht gesetzt (${slugParts[0]})`);
    return res.status(200).json(config.emptyResponse ?? {});
  }

  let url;
  if (config.base) {
    url = buildPathUrl(req, config, slugParts);
  } else if (config.passQuery) {
    const qs = new URLSearchParams(req.query);
    qs.delete('slug');
    const q = qs.toString();
    url = q ? `${config.target}?${q}` : config.target;
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
  res.status(response.status).setHeader('Content-Type', config.contentType);
  return res.send(text);
}

export default async function handler(req, res) {
  const slugParts = parseSlug(req);
  const source = slugParts[0];
  const config = SOURCES[source];

  const methods = config ? config.method : 'GET, POST';
  setCors(res, methods);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!config) return res.status(404).json({ error: 'Unknown tender source' });
  if (req.method !== config.method) return res.status(405).json({ error: 'Method not allowed' });

  try {
    return await forward(req, res, config, slugParts);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
