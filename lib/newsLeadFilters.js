/** Shared news/lead freshness + PHT relevance filters (ingest + UI). */

export const NEWS_MAX_AGE_DAYS = 60;
export const PLANNING_MAX_AGE_DAYS = 400;
export const NEWS_MIN_RELEVANCE_SCORE = 25;

export function isNewsLeadFresh(publishedAt, maxAgeDays = NEWS_MAX_AGE_DAYS, now = Date.now()) {
  if (!publishedAt) return false;
  const ts = new Date(publishedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts >= now - maxAgeDays * 86_400_000;
}

function leadMaxAgeDays(lead, options = {}) {
  if (lead?.sourceType === 'planning-api') return options.planningMaxAgeDays ?? PLANNING_MAX_AGE_DAYS;
  return options.maxAgeDays ?? NEWS_MAX_AGE_DAYS;
}

export function isNewsLeadRelevant(lead) {
  const score = lead.relevanceScore ?? 0;
  if (score < NEWS_MIN_RELEVANCE_SCORE) return false;
  return Boolean(
    lead.isMegaExpansion
    || lead.isCitizenOpposition
    || lead.leadType === 'sub-gu-tender'
    || lead.sourceType === 'planning-api'
    || lead.topSegment
    || (lead.matchedIndustries?.length > 0)
    || (lead.portfolioSegments?.length > 0)
    || lead.companyGuess,
  );
}

export function filterNewsLeads(leads, options = {}) {
  const now = options.now ?? Date.now();
  return (leads ?? []).filter(
    (lead) => isNewsLeadFresh(lead.publishedAt, leadMaxAgeDays(lead, options), now) && isNewsLeadRelevant(lead),
  );
}

export function filterDiscoveredLeads(leads, options = {}) {
  const maxAgeDays = options.maxAgeDays ?? NEWS_MAX_AGE_DAYS;
  const now = options.now ?? Date.now();
  return (leads ?? []).filter(
    (lead) => isNewsLeadFresh(lead.publishedAt, maxAgeDays, now) && (lead.relevanceScore ?? 0) > 0,
  );
}

export function withFilteredNewsPayload(payload, options = {}) {
  if (!payload || !Array.isArray(payload.leads)) return payload;
  const leads = filterNewsLeads(payload.leads, options);
  return { ...payload, leads, leadCount: leads.length };
}

export function withFilteredDiscoveredPayload(payload, options = {}) {
  if (!payload || !Array.isArray(payload.leads)) return payload;
  const leads = filterDiscoveredLeads(payload.leads, options);
  return { ...payload, leads, leadCount: leads.length };
}
