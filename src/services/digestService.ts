import type { Tender } from '../types/tender';
import { buildPowerActions } from '../lib/powerEngine';
import { getTargetEmail } from './integrationSettings';
import { sendSummaryEmail } from './microsoftIntegrations';
import { matchAlertRules, loadAlertRules } from './alertRules';

export function buildDailyDigest(tenders: Tender[]): { subject: string; body: string; matchCount: number } {
  const rules = loadAlertRules();
  const actions = buildPowerActions(tenders).slice(0, 10);
  const urgent = tenders.filter((t) => {
    const days = Math.ceil((new Date(t.deadline).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 14 && t.scoreRecommendation !== 'NO-GO';
  });
  const ruleMatches = tenders.filter((t) => matchAlertRules(t, rules).length > 0).slice(0, 15);
  const goNew = tenders
    .filter((t) => t.scoreRecommendation === 'GO' && t.status === 'Neu')
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const body = [
    'PHT Mastertool – Tages-Digest',
    `Datum: ${new Date().toLocaleDateString('de-DE')}`,
    '',
    `=== SOFORT-AKTIONEN (${actions.length}) ===`,
    ...actions.map((a, i) => `${i + 1}. [${a.winPriority}] ${a.title} – ${a.action} (${a.daysLeft}T)`),
    '',
    `=== FRISTEN < 14 TAGE (${urgent.length}) ===`,
    ...urgent.slice(0, 10).map((t) => `• ${t.deadline} – ${t.title} (${t.country}, Score ${t.score})`),
    '',
    `=== ALERT-REGEL MATCHES (${ruleMatches.length}) ===`,
    ...ruleMatches.map((t) => `• ${t.title} – Score ${t.score}, ${t.revenuePotential}`),
    '',
    `=== NEUE GO-CHANCEN (${goNew.length}) ===`,
    ...goNew.map((t) => `• ${t.title} – ${t.sourceUrl}`),
    '',
    'Command Center: https://pht-mastertool.vercel.app/command',
  ].join('\n');

  return {
    subject: `PHT Digest – ${urgent.length} Fristen, ${ruleMatches.length} Alerts`,
    body,
    matchCount: ruleMatches.length,
  };
}

export async function sendDailyDigest(tenders: Tender[]): Promise<{ success: boolean; message: string }> {
  const digest = buildDailyDigest(tenders);
  const email = getTargetEmail();
  return sendSummaryEmail(digest.subject, digest.body, email);
}

const LAST_DIGEST_KEY = 'pht_last_digest';

export function shouldAutoDigest(): boolean {
  const last = localStorage.getItem(LAST_DIGEST_KEY);
  if (!last) return true;
  const hours = (Date.now() - new Date(last).getTime()) / 3600000;
  return hours >= 24;
}

export function markDigestSent(): void {
  localStorage.setItem(LAST_DIGEST_KEY, new Date().toISOString());
}
