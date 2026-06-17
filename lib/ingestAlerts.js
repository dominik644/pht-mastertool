/**
 * Ingest-Alerts: neue High-Score-Tender (≥70) vs. letzter Lauf
 */
import { scoreTender } from './phtScoring.js';
import { hasServerMailConfig, sendServerEmail } from './microsoftMailServer.js';
import { getIngestState, hasSupabaseConfig, setIngestState } from './supabaseIngest.js';

const HIGH_SCORE_THRESHOLD = 70;
const INGEST_STATE_KEY = 'last_high_score_ids';
const DAILY_GO_STATE_KEY = 'last_daily_go_alert';

function scoreTenders(tenders) {
  return tenders.map((t) => ({ ...t, ...scoreTender(t) }));
}

function buildGoAlertEmail(goTenders) {
  const lines = goTenders
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(
      (t) =>
        `• [${t.score}] ${t.title} (${t.country}, ${t.submissionDeadline || t.deadline || '—'})\n  ${t.sourceUrl || '—'}`,
    );

  const body = [
    'PHT Mastertool – Täglicher GO-Report',
    `Zeitpunkt: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`,
    '',
    `=== TOP ${Math.min(10, goTenders.length)} NEUE GO-CHANCEN (Score ≥${HIGH_SCORE_THRESHOLD}) ===`,
    ...lines,
    '',
    'Command Center: https://pht-mastertool.vercel.app/command',
    'Opportunities: https://pht-mastertool.vercel.app/opportunities',
    '',
    'Hinweis: Digest auch im Browser unter Alerts verfügbar (MSAL-Anmeldung).',
  ].join('\n');

  return {
    subject: `PHT Daily GO – ${goTenders.length} neue Top-Chancen`,
    body,
  };
}

function buildAlertEmail(newTenders) {
  const lines = newTenders
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(
      (t) =>
        `• [${t.score}] ${t.title} (${t.country}, ${t.submissionDeadline || t.deadline || '—'})\n  ${t.sourceUrl || '—'}`,
    );

  const body = [
    'PHT Mastertool – Ingest-Alert',
    `Zeitpunkt: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`,
    '',
    `=== NEUE HIGH-SCORE-TENDER (≥${HIGH_SCORE_THRESHOLD}) – ${newTenders.length} ===`,
    ...lines,
    '',
    'Command Center: https://pht-mastertool.vercel.app/command',
    '',
    'Hinweis: Digest auch im Browser unter Alerts verfügbar (MSAL-Anmeldung).',
  ].join('\n');

  return {
    subject: `PHT Ingest – ${newTenders.length} neue Top-Chancen`,
    body,
  };
}

/**
 * @param {object[]} tenders – rohe Tender aus loadAllTenders
 * @returns {Promise<{ sent: boolean, newCount: number, skipped?: boolean, error?: string, fallback?: string }>}
 */
export async function runIngestAlerts(tenders) {
  const scored = scoreTenders(tenders);
  const goTenders = scored.filter((t) => t.score >= HIGH_SCORE_THRESHOLD && t.recommendation === 'GO');
  const highScore = scored.filter((t) => t.score >= HIGH_SCORE_THRESHOLD);
  const currentIds = highScore.map((t) => t.id);

  let previousIds = [];
  let previousGoIds = [];
  if (hasSupabaseConfig()) {
    const state = await getIngestState(INGEST_STATE_KEY);
    previousIds = Array.isArray(state?.ids) ? state.ids : [];
    const goState = await getIngestState(DAILY_GO_STATE_KEY);
    previousGoIds = Array.isArray(goState?.ids) ? goState.ids : [];
  }

  const prevSet = new Set(previousIds);
  const newTenders = highScore.filter((t) => !prevSet.has(t.id));

  const prevGoSet = new Set(previousGoIds);
  const newGoTenders = goTenders.filter((t) => !prevGoSet.has(t.id));

  if (hasSupabaseConfig()) {
    await setIngestState(INGEST_STATE_KEY, {
      ids: currentIds,
      updatedAt: new Date().toISOString(),
      highScoreCount: highScore.length,
    });
    await setIngestState(DAILY_GO_STATE_KEY, {
      ids: goTenders.map((t) => t.id),
      updatedAt: new Date().toISOString(),
      goCount: goTenders.length,
    });
  }

  if (!newGoTenders.length && !newTenders.length) {
    return { sent: false, newCount: 0, goCount: 0, skipped: true };
  }

  const to = process.env.INGEST_ALERT_EMAIL || process.env.VITE_MS_DEFAULT_USER;
  if (!to) {
    return {
      sent: false,
      newCount: newGoTenders.length || newTenders.length,
      goCount: newGoTenders.length,
      skipped: true,
      error: 'INGEST_ALERT_EMAIL nicht gesetzt – mailto-Fallback im Log',
      fallback: buildGoAlertEmail(newGoTenders.length ? newGoTenders : newTenders).subject,
    };
  }

  const alertTenders = newGoTenders.length ? newGoTenders : newTenders;
  const { subject, body } = buildGoAlertEmail(alertTenders);

  if (!hasServerMailConfig()) {
    console.info(
      '[ingest-alerts] MS Graph App-only nicht konfiguriert. mailto:%s?subject=%s',
      to,
      subject,
    );
    return {
      sent: false,
      newCount: newTenders.length,
      skipped: true,
      fallback: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}`,
    };
  }

  const mail = await sendServerEmail({ to, subject, body });
  if (!mail.ok) {
    return {
      sent: false,
      newCount: newTenders.length,
      error: mail.error || 'E-Mail fehlgeschlagen',
      fallback: mail.fallback,
    };
  }

  return { sent: true, newCount: alertTenders.length, goCount: newGoTenders.length };
}
