#!/usr/bin/env node
/**
 * Fetch PHT homepage product lines and write lib/phtHomepageProfile.js
 * Run: node scripts/fetch_pht_homepage_profile.mjs
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_PATH = join(ROOT, 'lib/phtHomepageProfile.js');

const HOMEPAGE_URLS = ['https://pht.group/', 'https://www.pht.group/', 'https://www.pht.de/', 'https://pht.de/'];

/** Known PHT product lines from homepage navigation (fallback if fetch fails). */
const FALLBACK_PRODUCT_LINES = [
  {
    id: 'personalhygiene',
    name: 'Personalhygiene',
    keywords: ['handhygiene', 'handreinigung', 'handdesinfektion', 'hygienestation', 'eingangskontrolle', 'personenschleuse', 'seifenspender', 'händetrockner'],
    segments: ['food', 'pharma', 'hospital'],
  },
  {
    id: 'betriebshygiene',
    name: 'Betriebshygiene',
    keywords: ['sohlenreiniger', 'sohlendesinfektion', 'sanicare', 'schürzenreinigung', 'stiefelreiniger', 'schuhtrocknung', 'stiefeltrockner', 'eingangssystem'],
    segments: ['food', 'production'],
  },
  {
    id: 'schaumniederdruck',
    name: 'Schaum- & Niederdrucktechnik',
    keywords: ['schaumstation', 'niederdruck', 'hauptstation', 'satellitenstation', 'schäumer', 'schaumreinigung', 'bodendose', 'druckerhöhungsanlage', 'foamico'],
    segments: ['production', 'logistics'],
  },
  {
    id: 'industriewaschanlagen',
    name: 'Industriewaschanlagen / Sonderbau',
    keywords: ['waschanlage', 'sonderbau', 'kistenwasch', 'behälterwasch', 'palettenwasch', 'containerwasch', 'waschkabinett', 'industriewasch'],
    segments: ['food', 'pharma', 'logistics'],
  },
  {
    id: 'schliessfach-garderobe',
    name: 'Schließfach & Garderobe',
    keywords: ['spind', 'garderobe', 'wertfachschrank', 'umkleide', 'feuerwehrspind', 'locker', 'wardrobe'],
    segments: ['public', 'hospital', 'sports'],
  },
  {
    id: 'reinigungsgeraete',
    name: 'Reinigungsgeräte & Utensilien',
    keywords: ['besen', 'bürste', 'schaufel', 'reinigungsbedarf', 'reinigungsgerät', 'bürstenreinigungsstation'],
    segments: ['food', 'hospital', 'production'],
  },
];

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFromHtml(html, url) {
  const text = stripHtml(html).toLowerCase();
  const navLinks = [...html.matchAll(/href="([^"]+)"[^>]*>([^<]{2,80})</gi)]
    .map((m) => ({ href: m[1], text: m[2].replace(/\s+/g, ' ').trim() }))
    .filter((l) => /produkt|hygiene|schaum|wasch|spind|garderobe|reinigung|station/i.test(`${l.href} ${l.text}`));

  const headings = [...html.matchAll(/<h[1-3][^>]*>([^<]{3,120})</gi)]
    .map((m) => m[1].replace(/\s+/g, ' ').trim())
    .filter((h) => h.length >= 4);

  const productTerms = new Set();
  for (const l of navLinks) {
    for (const tok of l.text.toLowerCase().split(/[^a-zäöüß0-9]+/)) {
      if (tok.length >= 4) productTerms.add(tok);
    }
  }
  for (const h of headings) {
    for (const tok of h.toLowerCase().split(/[^a-zäöüß0-9]+/)) {
      if (tok.length >= 5) productTerms.add(tok);
    }
  }

  const knownSegments = [];
  if (/lebensmittel|food|fleisch|molkerei|bakery/i.test(text)) knownSegments.push('food');
  if (/pharma|gmp|reinraum/i.test(text)) knownSegments.push('pharma');
  if (/krankenhaus|hospital|klinik/i.test(text)) knownSegments.push('hospital');
  if (/industrie|produktion|werk/i.test(text)) knownSegments.push('production');

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl: url,
    navLinks: navLinks.slice(0, 40),
    headings: headings.slice(0, 30),
    extractedTerms: [...productTerms].sort().slice(0, 80),
    segments: knownSegments,
  };
}

async function fetchHomepage() {
  const allTerms = new Set();
  const allNav = [];
  const allHeadings = [];
  let lastUrl = 'fallback';
  let fetchedAt = new Date().toISOString();
  let anyOk = false;

  for (const url of HOMEPAGE_URLS) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'PHT-Mastertool/1.0 (+https://pht.group)' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.length < 500) continue;
      const extracted = extractFromHtml(html, res.url || url);
      anyOk = true;
      lastUrl = extracted.sourceUrl;
      fetchedAt = extracted.fetchedAt;
      for (const t of extracted.extractedTerms) allTerms.add(t);
      allNav.push(...extracted.navLinks);
      allHeadings.push(...extracted.headings);
    } catch {
      /* try next */
    }
  }

  if (!anyOk) return null;

  return {
    fetchedAt,
    sourceUrl: lastUrl,
    navLinks: allNav.slice(0, 60),
    headings: [...new Set(allHeadings)].slice(0, 40),
    extractedTerms: [...allTerms].sort().slice(0, 120),
    segments: ['food', 'pharma', 'hospital', 'production'],
  };
}

const fetched = await fetchHomepage();
const productLines = FALLBACK_PRODUCT_LINES.map((line) => {
  const extraTerms = (fetched?.extractedTerms ?? []).filter((t) =>
    line.keywords.some((k) => k.includes(t) || t.includes(k.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue'))),
  );
  return {
    ...line,
    homepageTerms: [...new Set([...line.keywords, ...extraTerms])].slice(0, 20),
  };
});

const profile = {
  fetchedAt: fetched?.fetchedAt ?? new Date().toISOString(),
  sourceUrl: fetched?.sourceUrl ?? 'fallback',
  fetchOk: Boolean(fetched),
  segments: {
    foodFacility: ['lebensmittelbetrieb', 'food facility', 'food plant', 'food processing', 'schlachthof', 'molkerei', 'bäckerei'],
    industrialWashers: ['waschanlage', 'kistenwasch', 'behälterwasch', 'palettenwasch', 'containerwasch', 'sonderbau', 'industriewasch'],
    lockers: ['spind', 'garderobe', 'wertfachschrank', 'umkleide', 'feuerwehrspind', 'locker', 'wardrobe'],
    foamStations: ['schaumstation', 'niederdruck', 'hauptstation', 'satellitenstation', 'schäumer', 'schaumreinigung'],
    cleaningTools: ['besen', 'bürste', 'schaufel', 'reinigungsbedarf', 'reinigungsgerät', 'bürstenreinigungsstation'],
  },
  productLines,
  homepage: fetched ?? { note: 'Fetch failed – using curated fallback product lines' },
};

const output = `/**
 * AUTO-GENERATED – PHT homepage product profile.
 * Regenerate: node scripts/fetch_pht_homepage_profile.mjs
 */
export const PHT_HOMEPAGE_PROFILE = ${JSON.stringify(profile, null, 2)};

export const PHT_HOMEPAGE_PRODUCT_LINES = PHT_HOMEPAGE_PROFILE.productLines;

export const PHT_USER_SEGMENTS = PHT_HOMEPAGE_PROFILE.segments;

/** Flat keywords from homepage product lines */
export const PHT_HOMEPAGE_KEYWORDS = ${JSON.stringify(
  [...new Set(productLines.flatMap((l) => l.homepageTerms))].sort(),
  null,
  2,
)};
`;

writeFileSync(OUT_PATH, output, 'utf8');
console.log(`Wrote ${OUT_PATH}`);
console.log(`  fetchOk=${profile.fetchOk} source=${profile.sourceUrl}`);
console.log(`  productLines=${productLines.length} homepageKeywords=${profile.homepage ? 'ok' : 'fallback'}`);
