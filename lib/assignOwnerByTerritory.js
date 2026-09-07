/**
 * Weist Leads/Kunden per PLZ/Bundesland dem passenden Vertriebsrep zu.
 */
import { inferBundesland } from './bundeslandFromPlz.js';
import { COLLEAGUES } from './defaultAppUsers.js';

const OST = ['Wien', 'Niederösterreich', 'Oberösterreich', 'Steiermark', 'Burgenland', 'Kärnten'];
const WEST = ['Vorarlberg', 'Tirol', 'Salzburg'];
const AT_ALL = new Set([...OST, ...WEST]);

const REP_REGIONS = {
  'Dominik Weller': OST,
  'Rudolf Tripold': WEST,
};

/** @param {import('./phtCustomerProfile.js').CustomerLike[]} customers */
export function buildRepRegionsFromCustomers(customers) {
  /** @type {Record<string, Set<string>>} */
  const map = {};
  for (const name of COLLEAGUES.map((c) => c.name)) {
    map[name] = new Set(REP_REGIONS[name] ?? []);
  }
  for (const c of customers) {
    const rep = c.salesRep?.trim() || c.owner?.trim();
    if (!rep || !map[rep]) continue;
    const bl = c.bundesland || inferBundesland(c.zip, c.country, c.city);
    if (bl && AT_ALL.has(bl)) map[rep].add(bl);
  }
  return map;
}

function isGermanLead(lead) {
  const cc = String(lead.country ?? '').toUpperCase();
  if (cc === 'DE' || cc === 'DEU') return true;
  const zip = String(lead.zip ?? '').trim().replace(/\s+/g, '');
  return /^\d{5}$/.test(zip);
}

/**
 * @param {{ zip?: string, city?: string, country?: string, bundesland?: string }} lead
 * @param {Record<string, Set<string>>} repRegions
 */
export function assignOwnerByTerritory(lead, repRegions) {
  if (isGermanLead(lead)) {
    return { owner: 'Dominik Weller', salesRep: 'Dominik Weller', note: 'DE-Lead' };
  }
  const bl = lead.bundesland || inferBundesland(lead.zip, lead.country, lead.city);
  if (bl && AT_ALL.has(bl)) {
    for (const [rep, regions] of Object.entries(repRegions)) {
      if (regions.has(bl)) {
        return { owner: rep, salesRep: rep };
      }
    }
    if (OST.includes(bl)) return { owner: 'Dominik Weller', salesRep: 'Dominik Weller' };
    if (WEST.includes(bl)) return { owner: 'Rudolf Tripold', salesRep: 'Rudolf Tripold' };
  }
  return { owner: 'Dominik Weller', salesRep: 'Dominik Weller' };
}
