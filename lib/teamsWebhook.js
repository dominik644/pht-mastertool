/**
 * MS Teams Incoming Webhook – optionaler Kanal für Ingest-Alerts.
 * Env: TEAMS_WEBHOOK_URL
 *
 * WhatsApp Business API: bewusst nicht implementiert (erfordert Meta Business-Verifizierung).
 */

/**
 * @param {{ title: string, text: string, themeColor?: string }} opts
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function sendTeamsMessage({ title, text, themeColor = '0078D4' }) {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) {
    return { ok: false, skipped: true, error: 'TEAMS_WEBHOOK_URL nicht gesetzt' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor,
        summary: title,
        sections: [{ activityTitle: title, text: text.slice(0, 28000) }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `Teams ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Teams-Fehler' };
  }
}
