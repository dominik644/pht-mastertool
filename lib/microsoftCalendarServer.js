import { getAppAccessToken, hasServerMailConfig } from './microsoftMailServer.js';
import { getCalendarUser } from './calendarBusyTimes.js';

export function hasServerCalendarWriteConfig() {
  return hasServerMailConfig();
}

/**
 * @param {{ subject: string, body: string, start: string, end: string, location?: string, attendeeEmails?: string[] }} params
 */
export async function createServerCalendarEvent(params) {
  const token = await getAppAccessToken();
  const user = getCalendarUser();
  if (!token || !user) {
    return { ok: false, skipped: true, error: 'Microsoft Graph Kalender nicht verfügbar' };
  }

  const attendees = (params.attendeeEmails ?? [])
    .filter(Boolean)
    .map((email) => ({
      emailAddress: { address: email, name: email },
      type: 'required',
    }));

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: params.subject,
        body: {
          contentType: 'HTML',
          content: String(params.body).replace(/\n/g, '<br>'),
        },
        start: { dateTime: params.start, timeZone: 'Europe/Berlin' },
        end: { dateTime: params.end, timeZone: 'Europe/Berlin' },
        location: params.location ? { displayName: params.location } : undefined,
        attendees: attendees.length ? attendees : undefined,
      }),
      signal: AbortSignal.timeout(20000),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `Graph Kalender ${res.status}: ${err.slice(0, 160)}` };
  }

  const data = await res.json();
  return { ok: true, id: data.id };
}
