import type { NewsLead } from '../types/newsLead';

const INVESTMENT_KEYWORD = /invest|million|milliarde|billion|expansion|neubau|greenfield|capacity|kapazität/i;

const COUNTRY_LABELS: Record<string, string> = {
  DE: 'Deutschland',
  AT: 'Österreich',
  CH: 'Schweiz',
  FR: 'Frankreich',
  NL: 'Niederlande',
  BE: 'Belgien',
  UK: 'Großbritannien',
  IE: 'Irland',
  PL: 'Polen',
  IT: 'Italien',
  ES: 'Spanien',
  US: 'USA',
};

export function stripLeadHtml(text: string): string {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatNewsCountry(code: string | null | undefined): string | null {
  if (!code) return null;
  return COUNTRY_LABELS[code] ?? code;
}

/** 2–4 German bullet points for quick relevance check (PHT: company, project, investment, location). */
export function buildNewsLeadKeyPoints(lead: NewsLead): string[] {
  const points: string[] = [];

  if (lead.companyGuess) {
    points.push(`Unternehmen: ${lead.companyGuess}`);
  }

  if (lead.projectType) {
    points.push(`Projekttyp: ${lead.projectType}`);
  }

  const investSignals = lead.matchedKeywords?.filter((k) => INVESTMENT_KEYWORD.test(k)) ?? [];
  if (investSignals.length > 0) {
    points.push(`Investition: ${investSignals.slice(0, 3).join(', ')}`);
  } else if (lead.isMegaExpansion) {
    points.push('Investition: Mega-Expansion / Großprojekt');
  }

  const location = formatNewsCountry(lead.country);
  const locParts = [location, lead.topSegment].filter(Boolean);
  if (locParts.length > 0) {
    points.push(`Standort: ${locParts.join(' · ')}`);
  }

  if (points.length < 4 && lead.tenderLikelihood != null && lead.tenderLikelihood >= 40) {
    points.push(`Ausschreibungs-Chance: ${lead.tenderLikelihood}%`);
  }

  if (points.length < 2 && lead.summaryDe) {
    points.push(lead.summaryDe);
  }

  return points.slice(0, 4);
}

export function newsLeadDescriptionExcerpt(lead: NewsLead, maxLen = 220): string {
  const raw = stripLeadHtml(lead.description ?? '');
  if (!raw) return '';
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
}
