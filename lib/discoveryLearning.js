/**
 * Aggregiert Daumen-Feedback mit Begründungen für Neukunden-Discovery & Scoring.
 */

/** @typedef {{ id: string, label: string, polarity: 'good' | 'bad' }} ReasonPreset */

export const LEAD_REASON_PRESETS = [
  { id: 'portfolio_fit', label: 'Passt zu Portfolio / Equipment-Bedarf', polarity: 'good' },
  { id: 'growth_potential', label: 'Gutes Potenzial / richtige Größe', polarity: 'good' },
  { id: 'region_fit', label: 'Region passt / gut erreichbar', polarity: 'good' },
  { id: 'growth_sector', label: 'Wachstumsbranche / Expansion', polarity: 'good' },
  { id: 'warm_lead', label: 'Bekannter Kontakt / Warm Lead', polarity: 'good' },
  { id: 'wrong_sector', label: 'Falsche Branche / kein Bedarf', polarity: 'bad' },
  { id: 'too_small', label: 'Zu klein / kein Potenzial', polarity: 'bad' },
  { id: 'too_far', label: 'Zu weit / nicht im Gebiet', polarity: 'bad' },
  { id: 'meat_deprioritized', label: 'Fleischbetrieb (depriorisiert)', polarity: 'bad' },
  { id: 'trader_service', label: 'Handel / Dienstleister ohne Produktion', polarity: 'bad' },
  { id: 'duplicate', label: 'Duplikat / bereits Kunde', polarity: 'bad' },
  { id: 'other', label: 'Sonstiges', polarity: 'neutral' },
];

const PRESET_BY_ID = Object.fromEntries(LEAD_REASON_PRESETS.map((p) => [p.id, p]));

/**
 * @returns {{
 *   version: number,
 *   updatedAt: string,
 *   likedSectors: Record<string, number>,
 *   dislikedSectors: Record<string, number>,
 *   likedTags: Record<string, number>,
 *   dislikedTags: Record<string, number>,
 *   excludeSectorIds: string[],
 *   boostSectorIds: string[],
 *   notes: string[],
 * }}
 */
export function emptyDiscoveryProfile() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    likedSectors: {},
    dislikedSectors: {},
    likedTags: {},
    dislikedTags: {},
    excludeSectorIds: [],
    boostSectorIds: [],
    notes: [],
  };
}

/**
 * @param {Record<string, import('./salesLearning.js').CustomerFeedback>} feedbackStore
 * @param {Record<string, { sector?: string, name?: string }>} [customerMeta]
 */
export function buildDiscoveryProfile(feedbackStore, customerMeta = {}) {
  const profile = emptyDiscoveryProfile();

  for (const [customerId, fb] of Object.entries(feedbackStore ?? {})) {
    if (!fb?.leadRating || !fb.leadReason && !(fb.reasonTags?.length)) continue;

    const meta = customerMeta[customerId] ?? {};
    const sector = meta.sector ?? fb.sectorHits?.[fb.sectorHits.length - 1];
    const polarity = fb.leadRating === 'good' ? 'good' : 'bad';
    const tags = fb.reasonTags?.length ? fb.reasonTags : inferTagsFromReason(fb.leadReason, polarity);

    if (sector) {
      const bucket = polarity === 'good' ? profile.likedSectors : profile.dislikedSectors;
      bucket[sector] = (bucket[sector] ?? 0) + 1;
    }

    for (const tag of tags) {
      const preset = PRESET_BY_ID[tag];
      const tagPolarity = preset?.polarity === 'neutral' ? polarity : (preset?.polarity ?? polarity);
      const bucket = tagPolarity === 'good' ? profile.likedTags : profile.dislikedTags;
      bucket[tag] = (bucket[tag] ?? 0) + 1;
    }

    if (fb.leadReason?.trim()) {
      profile.notes.push(fb.leadReason.trim());
    }
  }

  profile.excludeSectorIds = Object.entries(profile.dislikedSectors)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  profile.boostSectorIds = Object.entries(profile.likedSectors)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  if (profile.dislikedTags.meat_deprioritized >= 1) {
    if (!profile.excludeSectorIds.includes('meat')) profile.excludeSectorIds.push('meat');
  }
  if (profile.dislikedTags.trader_service >= 2) {
    profile.excludeSectorIds.push('logistics');
  }

  profile.notes = [...new Set(profile.notes)].slice(-40);
  profile.updatedAt = new Date().toISOString();
  return profile;
}

/**
 * @param {string | undefined} reason
 * @param {'good' | 'bad'} polarity
 * @returns {string[]}
 */
function inferTagsFromReason(reason, polarity) {
  if (!reason?.trim()) return polarity === 'good' ? ['portfolio_fit'] : ['wrong_sector'];
  const lower = reason.toLowerCase();
  const tags = [];
  for (const preset of LEAD_REASON_PRESETS) {
    if (preset.id === 'other') continue;
    const keywords = preset.label.toLowerCase().split(/[/\s]+/).filter((w) => w.length > 4);
    if (keywords.some((k) => lower.includes(k.slice(0, 6)))) tags.push(preset.id);
  }
  return tags.length ? tags : ['other'];
}

/**
 * @param {{ sector?: string, name?: string, sectorLabel?: string, isMeatIndustry?: boolean }} lead
 * @param {ReturnType<typeof emptyDiscoveryProfile>} profile
 */
export function scoreDiscoveryLead(lead, profile) {
  if (!profile) return 0;
  let score = 0;
  const sector = lead.sector ?? '';

  if (profile.excludeSectorIds.includes(sector)) return -100;
  if (lead.isMeatIndustry && profile.dislikedTags.meat_deprioritized) return -80;

  if (profile.boostSectorIds.includes(sector)) score += 25;
  score += (profile.likedSectors[sector] ?? 0) * 8;
  score -= (profile.dislikedSectors[sector] ?? 0) * 12;

  const name = `${lead.name ?? ''} ${lead.sectorLabel ?? ''}`.toLowerCase();
  if (profile.dislikedTags.trader_service >= 2 && /handel|logistik|spedition|beratung/.test(name)) {
    score -= 30;
  }
  if (profile.likedTags.growth_sector) score += 5;
  if (profile.likedTags.region_fit) score += 3;

  return score;
}

/**
 * @param {{ sector?: string, name?: string, isMeatIndustry?: boolean }} lead
 * @param {ReturnType<typeof emptyDiscoveryProfile>} profile
 */
export function shouldSkipDiscoveryLead(lead, profile) {
  return scoreDiscoveryLead(lead, profile) <= -50;
}
