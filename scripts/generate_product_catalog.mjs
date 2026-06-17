#!/usr/bin/env node
/**
 * Generate lib/phtProductCatalog.js – unified PHT product catalog.
 * Sources: priceList2026.json, phtHomepageProfile.js, productProfiles.js
 * Run: node scripts/generate_product_catalog.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PHT_PORTFOLIO_SEGMENTS, getSegmentKeywords } from '../lib/phtPortfolio.js';
import { PRODUCT_PROFILES } from '../lib/productProfiles.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const JSON_PATH = join(ROOT, 'src/data/priceList2026.json');
const HOMEPAGE_PATH = join(ROOT, 'lib/phtHomepageProfile.js');
const OUT_PATH = join(ROOT, 'lib/phtProductCatalog.js');

const EQUIPMENT_CATEGORY_IDS = new Set([
  'hygienestation-mit-sohlen-und-handdesinfektion-reinigung', 'handreinigungsbecken',
  'behälterreinigungsanlage', 'hygienestation-mit-sohlenreinigung-und-handdesinfektion',
  'schuhtrocknungssystem', 'stiefeltrockner', 'trocknungsanlage', 'stiefelaufbewahrung',
  'sohlen-schuh-und-stiefelreiniger', 'automatische-spender', 'eingangskontrolle-mit-handreinigung-und-desinfektion',
  'messerkorbreinigungsanlage', 'waschkabinett', 'sohlendesinfektion', 'sohlenreiniger',
  'druckerhöhungsanlagen', 'eingangskontrolle', 'messerhalter-und-sterilisation', 'satelliten',
  'niederdruck-hauptstation', 'schläuche-und-pistolen', 'schürzenreinigung-und-aufbewahrung',
  'frontlader-reinigungsanlagen', 'automatik-hauptstation', 'fahrwagen-für-schaumreinigung',
  'mobile-hauptstation', 'schäumer', 'bürstenreinigungsstation', 'desinfektionsmatte',
  'gabelhubwagen', 'hygienestation-mit-hand-und-sohlenreinigung', 'palettenreinigungsanlage',
  'portaldrehkreuz', 'schlauchaufroller', 'spender-und-körbe', 'händetrockner', 'seifenspender',
  'abfallsammler',
]);

const CATEGORY_LINE_MAP = [
  { pattern: /handreinigung|hygienestation|eingangskontrolle|spender|händetrockner|seifenspender/i, lineId: 'personalhygiene' },
  { pattern: /sohlen|stiefel|schuh|schürzen|portaldrehkreuz|drehsperre|sanicare/i, lineId: 'betriebshygiene' },
  { pattern: /schaum|niederdruck|schäumer|satellit|hauptstation|druckerhöhung|schlauch|pistole/i, lineId: 'schaumniederdruck' },
  { pattern: /wasch|behälter|kisten|paletten|container|frontlader|gabelhub|messer|bürstenreinigung|desinfektionsmatte/i, lineId: 'industriewaschanlagen' },
  { pattern: /reinigungsbedarf|besen|bürste|schaufel/i, lineId: 'reinigungsgeraete' },
];

function inferLineId(categoryName, categoryId) {
  const blob = `${categoryName} ${categoryId}`;
  for (const m of CATEGORY_LINE_MAP) {
    if (m.pattern.test(blob)) return m.lineId;
  }
  return 'industriewaschanlagen';
}

function tokenize(text) {
  return [...new Set(
    String(text || '').toLowerCase()
      .split(/[^a-zäöüß0-9]+/)
      .filter((t) => t.length >= 3),
  )];
}

const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));

let homepageProfile = { segments: {}, productLines: [] };
if (existsSync(HOMEPAGE_PATH)) {
  const mod = await import(`file://${HOMEPAGE_PATH.replace(/\\/g, '/')}`);
  homepageProfile = mod.PHT_HOMEPAGE_PROFILE ?? homepageProfile;
}

const categoryByName = Object.fromEntries(data.categories.map((c) => [c.name, c]));

const articles = data.products.map((p) => {
  const cat = categoryByName[p.category];
  const catId = cat?.id ?? '';
  const isEquipment = EQUIPMENT_CATEGORY_IDS.has(catId) || p.category === 'Reinigungsbedarf';
  const lineId = inferLineId(p.category, catId);
  const familyMatch = p.name.match(/\b(EWG|DZW|SANICARE|COMBI|EKW|EZD|HDT|HST|HFS|NDR|EDW|EPW|ENW)[-\s]?/i);
  const family = familyMatch ? familyMatch[1].toLowerCase() : null;
  const keywords = [...new Set([
    ...tokenize(p.name),
    ...tokenize(p.category),
    ...tokenize(p.group),
    ...(p.keywords ?? []),
    ...(family ? [family] : []),
  ])].filter((k) => k.length >= 3);
  return {
    articleNumber: p.articleNumber,
    name: p.name,
    category: p.category,
    categoryId: catId,
    group: p.group,
    price: p.price,
    lineId,
    isEquipment,
    keywords,
    family,
  };
});

const categories = data.categories.map((c) => ({
  id: c.id,
  name: c.name,
  lineId: inferLineId(c.name, c.id),
  isEquipment: EQUIPMENT_CATEGORY_IDS.has(c.id) || c.id !== 'reinigungsbedarf',
  keywords: tokenize(c.name),
  productCount: c.productCount,
}));

const lines = PRODUCT_PROFILES.map((profile) => {
  const homepage = homepageProfile.productLines?.find((l) => l.id === profile.id);
  return {
    id: profile.id,
    name: profile.name,
    keywords: [...new Set([...profile.keywords, ...(homepage?.homepageTerms ?? [])])],
    segments: homepage?.segments ?? [],
    products: profile.products,
  };
});

const segments = Object.fromEntries(
  PHT_PORTFOLIO_SEGMENTS.map((seg) => [seg.id, getSegmentKeywords(seg)]),
);

const virtualArticles = [
  {
    articleNumber: 'VIRT-SCHLIESSFACH',
    name: 'Spinde / Garderobe / Wertfachschrank',
    category: 'Schließfach & Garderobe',
    categoryId: 'schliessfach-garderobe',
    group: 'Homepage',
    price: 0,
    lineId: 'schliessfach-garderobe',
    isEquipment: true,
    keywords: [...new Set(lines.find((l) => l.id === 'schliessfach-garderobe')?.keywords ?? [])],
    family: null,
    virtual: true,
  },
];

const catalog = {
  generatedAt: new Date().toISOString(),
  sources: {
    priceList: data.source,
    productCount: data.productCount,
    categoryCount: data.categories.length,
    homepage: homepageProfile.sourceUrl ?? 'fallback',
    homepageFetchedAt: homepageProfile.fetchedAt ?? null,
  },
  segments,
  lines,
  categories,
  articles: [...articles, ...virtualArticles],
};

const output = `/**
 * AUTO-GENERATED – unified PHT product catalog.
 * Regenerate: node scripts/generate_product_catalog.mjs
 * (run scripts/fetch_pht_homepage_profile.mjs first for fresh homepage data)
 */
export const PHT_PRODUCT_CATALOG = ${JSON.stringify(catalog, null, 2)};

export const PHT_CATALOG_ARTICLE_COUNT = ${catalog.articles.length};
export const PHT_CATALOG_CATEGORY_COUNT = ${catalog.categories.length};
`;

writeFileSync(OUT_PATH, output, 'utf8');
console.log(`Wrote ${OUT_PATH}`);
console.log(`  articles=${catalog.articles.length} categories=${catalog.categories.length} lines=${catalog.lines.length}`);
