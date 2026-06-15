/**
 * Server-seitiger Microsoft Graph Mail (App-only / client credentials).
 * Env: MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID, INGEST_ALERT_FROM
 */

async function getAppAccessToken() {
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  const tenantId = process.env.MS_GRAPH_TENANT_ID;
  if (!clientId || !clientSecret || !tenantId) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export function hasServerMailConfig() {
  return Boolean(
    process.env.MS_GRAPH_CLIENT_ID &&
      process.env.MS_GRAPH_CLIENT_SECRET &&
      process.env.MS_GRAPH_TENANT_ID &&
      (process.env.INGEST_ALERT_FROM || process.env.INGEST_ALERT_EMAIL),
  );
}

/**
 * @param {{ to: string, subject: string, body: string }} params
 */
export async function sendServerEmail({ to, subject, body }) {
  const token = await getAppAccessToken();
  const fromUser = process.env.INGEST_ALERT_FROM || process.env.INGEST_ALERT_EMAIL;
  if (!token || !fromUser) {
    return {
      ok: false,
      skipped: true,
      fallback: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}`,
    };
  }

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromUser)}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'Text', content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `Graph ${res.status}: ${err.slice(0, 160)}` };
  }
  return { ok: true };
}
