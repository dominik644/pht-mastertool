/**
 * Ingest-Alerts: neue High-Score-Tender (≥70) + täglicher GO-Report + Mega-Expansion News
 * Kanäle: E-Mail (MS Graph), MS Teams Webhook (TEAMS_WEBHOOK_URL)
 *
 * WhatsApp Business API: bewusst nicht implementiert – erfordert Meta Business-Verifizierung
 * und kostenpflichtige Cloud-API. Siehe lib/teamsWebhook.js für verfügbare Kanäle.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreTender } from './phtScoring.js';
import { hasServerMailConfig, sendServerEmail } from './microsoftMailServer.js';
import { sendTeamsMessage } from './teamsWebhook.js';
import { getIngestState, hasSupabaseConfig, setIngestState } from './supabaseIngest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEWS_LEADS_PATH = join(__dirname, '../public/data/leads/news-leads.json');

const HIGH_SCORE_THRESHOLD = 70;
const INGEST_STATE_KEY = 'last_high_score_ids';
const DAILY_GO_STATE_KEY = 'last_daily_go_alert';

function scoreTenders(tenders) {
  return tenders.map((t) => ({ ...t, ...scoreTender(t) }));
}

function loadMegaExpansionNews() {
  try {
    if (!existsSync(NEWS_LEADS_PATH)) return [];
    const data = JSON.parse(readFileSync(NEWS_LEADS_PATH, 'utf8'));
    return (data.leads || [])
      .filter((l) => l.isMegaExpansion)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 5);
  } catch {
    return [];
  }
}

function buildDailyDigestEmail(goTenders, megaNews) {
  const goLines = goTenders
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(
      (t) =>
        `• [${t.score}] ${t.title} (${t.country}, ${t.submissionDeadline || t.deadline || '—'})\n  ${t.sourceUrl || '—'}`,
    );

  const newsLines = megaNews.map(
    (n) => `• ${n.title}${n.companyGuess ? ` (${n.companyGuess})` : ''}\n  ${n.url || '—'}`,
  );

  const body = [
    'PHT Mastertool – Täglicher Executive Digest',
    `Zeitpunkt: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`,
    '',
    `=== TOP ${Math.min(10, goTenders.length)} NEUE GO-CHANCEN (Score ≥${HIGH_SCORE_THRESHOLD}) ===`,
    ...goLines,
    '',
    megaNews.length
      ? `=== MEGA-EXPANSION NEWS (${megaNews.length}) ===`
      : '=== MEGA-EXPANSION NEWS: keine neuen Signale ===',
    ...newsLines,
    '',
    'Executive Dashboard: https://pht-mastertool.vercel.app/dashboard',
    'Command Center: https://pht-mastertool.vercel.app/command',
    'Opportunities: https://pht-mastertool.vercel.app/opportunities',
    'Pipeline: https://pht-mastertool.vercel.app/pipeline',
    '',
    'Hinweis: Digest auch im Browser unter Alerts verfügbar (MSAL-Anmeldung).',
    'WhatsApp-Alerts: nicht verfügbar (Business API erforderlich).',
  ].join('\n');

  return {
    subject: `PHT Daily Digest – ${goTenders.length} GO · ${megaNews.length} Mega-News`,
    body,
  };
}

/**
 * @param {object[]} tenders – rohe Tender aus loadAllTenders
 * @returns {Promise<{ sent: boolean, newCount: number, skipped?: boolean, error?: string, fallback?: string, teams?: object }>}
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

  const megaNews = loadMegaExpansionNews();

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

  if (!newGoTenders.length && !newTenders.length && !megaNews.length) {
    return { sent: false, newCount: 0, goCount: 0, skipped: true };
  }

  const alertTenders = newGoTenders.length ? newGoTenders : newTenders;
  const { subject, body } = buildDailyDigestEmail(alertTenders, megaNews);

  const teamsResult = await sendTeamsMessage({
    title: subject,
    text: body,
    themeColor: '10B981',
  });

  const to = process.env.INGEST_ALERT_EMAIL || process.env.VITE_MS_DEFAULT_USER;
  if (!to) {
    return {
      sent: false,
      newCount: newGoTenders.length || newTenders.length,
      goCount: newGoTenders.length,
      megaNewsCount: megaNews.length,
      skipped: true,
      teams: teamsResult,
      error: 'INGEST_ALERT_EMAIL nicht gesetzt – mailto-Fallback im Log',
      fallback: subject,
    };
  }

  if (!hasServerMailConfig()) {
    console.info(
      '[ingest-alerts] MS Graph App-only nicht konfiguriert. mailto:%s?subject=%s',
      to,
      subject,
    );
    return {
      sent: teamsResult.ok,
      newCount: newTenders.length,
      goCount: newGoTenders.length,
      megaNewsCount: megaNews.length,
      skipped: !teamsResult.ok,
      teams: teamsResult,
      fallback: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}`,
    };
  }

  const mail = await sendServerEmail({ to, subject, body });
  if (!mail.ok) {
    return {
      sent: teamsResult.ok,
      newCount: newTenders.length,
      goCount: newGoTenders.length,
      megaNewsCount: megaNews.length,
      teams: teamsResult,
      error: mail.error || 'E-Mail fehlgeschlagen',
      fallback: mail.fallback,
    };
  }

  return {
    sent: true,
    newCount: alertTenders.length,
    goCount: newGoTenders.length,
    megaNewsCount: megaNews.length,
    teams: teamsResult,
  };
}
