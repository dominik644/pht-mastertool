/**
 * Hunter.io – Kontakt-Anreicherung (HUNTER_API_KEY).
 * @see https://hunter.io/api-documentation/v2
 */

const HUNTER_BASE = 'https://api.hunter.io/v2';

const PREFERRED_PREFIXES = [
  'info', 'office', 'kontakt', 'contact', 'mail',
  'qm', 'quality', 'qualitaet', 'qualität',
  'vertrieb', 'sales', 'hello', 'anfrage', 'service',
];

function apiKey() {
  return process.env.HUNTER_API_KEY?.trim() || '';
}

function prefixScore(email) {
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  const idx = PREFERRED_PREFIXES.findIndex(
    (p) => local === p || local.startsWith(`${p}.`) || local.startsWith(`${p}-`),
  );
  return idx >= 0 ? idx : 999;
}

function pickBestEmail(emails) {
  if (!emails?.length) return null;
  const sorted = [...emails]
    .map((e) => (typeof e === 'string' ? e : e.value))
    .filter(Boolean)
    .sort((a, b) => prefixScore(a) - prefixScore(b) || a.length - b.length);
  return sorted[0] ?? null;
}

function domainFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
}

function cleanCompanyName(name) {
  return String(name ?? '')
    .replace(/\s*-\s*(Plant|Werk|Standort|Standort\s+\w+).*$/i, '')
    .replace(/\s+(GmbH|AG|KG|e\.?G\.?|SE|OHG|GmbH\s*&\s*Co\.?\s*KG|Ltd\.?|Inc\.?|SA|BV|NV)\s*$/i, '')
    .trim();
}

function guessDomainsFromName(name, country) {
  const cleaned = cleanCompanyName(name);
  const slug = cleaned
    .replace(/[^a-z0-9äöüß]/gi, '')
    .toLowerCase()
    .slice(0, 40);
  if (!slug || slug.length < 4) return [];

  const cc = String(country ?? '').toUpperCase();
  const tldOrder = cc === 'AT'
    ? ['.at', '.com', '.de', '.eu']
    : cc === 'DE'
      ? ['.de', '.com', '.at', '.eu']
      : cc === 'CH'
        ? ['.ch', '.com', '.de', '.at']
        : ['.com', '.de', '.at', '.eu'];

  return tldOrder.map((tld) => `${slug}${tld}`);
}

async function hunterFetch(path, params = {}) {
  const key = apiKey();
  if (!key) return { ok: false, status: 0, error: 'HUNTER_API_KEY fehlt' };

  const qs = new URLSearchParams({ ...params, api_key: key });
  const res = await fetch(`${HUNTER_BASE}${path}?${qs}`, {
    signal: AbortSignal.timeout(18_000),
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: res.status, error: json?.errors?.[0]?.details || 'Ungültiger API-Key oder Limit' };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: json?.errors?.[0]?.details || `HTTP ${res.status}` };
  }

  return { ok: true, status: res.status, data: json?.data ?? json };
}

/**
 * Hunter-Konto prüfen (Credits / Requests).
 */
export async function checkHunterAccount() {
  const result = await hunterFetch('/account');
  if (!result.ok) return { ok: false, error: result.error, configured: Boolean(apiKey()) };

  const d = result.data ?? {};
  return {
    ok: true,
    configured: true,
    email: d.email,
    plan: d.plan_name,
    requestsAvailable: d.requests?.available ?? d.requests?.credits ?? null,
    requestsUsed: d.requests?.used ?? null,
    resetDate: d.reset_date ?? null,
  };
}

async function domainSearch(params) {
  const result = await hunterFetch('/domain-search', { limit: 8, ...params });
  if (!result.ok) return null;
  return result.data;
}

async function emailFinder(params) {
  const result = await hunterFetch('/email-finder', params);
  if (!result.ok) return null;
  return result.data;
}

function resultFromDomainData(data, sourceUrl) {
  if (!data) return null;
  const email = pickBestEmail(data.emails ?? []);
  if (!email || email === 'richard@piedpiper.com') return null;
  const phone = data.phone || data.emails?.find((e) => e.phone)?.phone || null;
  const domain = data.domain || domainFromUrl(sourceUrl);
  if (domain?.includes('piedpiper.com')) return null;
  return {
    contactEmail: email,
    contactPhone: phone,
    enrichmentSource: domain ? `https://${domain}` : sourceUrl,
    enrichmentProvider: 'hunter',
  };
}

/**
 * @param {{ name?: string, researchUrl?: string, zip?: string, city?: string, country?: string }} customer
 */
export async function enrichContactViaHunter(customer) {
  if (!apiKey()) return null;

  const company = cleanCompanyName(customer.name);
  const country = customer.country || (customer.zip && /^\d{4}$/.test(String(customer.zip).trim()) ? 'AT' : 'DE');

  // 1) Bekannte Domain aus researchUrl
  const knownDomain = customer.researchUrl ? domainFromUrl(customer.researchUrl) : null;
  if (knownDomain) {
    const data = await domainSearch({ domain: knownDomain });
    const hit = resultFromDomainData(data, `https://${knownDomain}`);
    if (hit) return hit;
  }

  // 2) Firmenname → Hunter findet Domain
  if (company.length >= 3) {
    const data = await domainSearch({ company, country });
    const hit = resultFromDomainData(data, data?.domain ? `https://${data.domain}` : undefined);
    if (hit) return hit;
  }

  // 3) Geratene Domains
  for (const domain of guessDomainsFromName(customer.name, country)) {
    const data = await domainSearch({ domain });
    const hit = resultFromDomainData(data, `https://${domain}`);
    if (hit) return hit;
  }

  // 4) Email-Finder (Domain + Firma)
  const domainsToTry = [
    knownDomain,
    ...guessDomainsFromName(customer.name, country),
  ].filter(Boolean);

  for (const domain of [...new Set(domainsToTry)]) {
    const data = await emailFinder({ domain, company });
    if (data?.email && data.email !== 'richard@piedpiper.com' && !domain?.includes('piedpiper.com')) {
      return {
        contactEmail: data.email,
        contactPhone: data.phone || null,
        enrichmentSource: `https://${domain}`,
        enrichmentProvider: 'hunter',
        enrichmentConfidence: data.score ?? null,
      };
    }
  }

  return null;
}

export function hunterConfigured() {
  return Boolean(apiKey());
}
