import { getAppAccessToken, hasServerMailConfig } from './microsoftMailServer.js';

export function hasServerCalendarConfig() {
  return hasServerMailConfig();
}

export function getCalendarUser() {
  return (
    process.env.MS_GRAPH_CALENDAR_USER
    || process.env.INGEST_ALERT_FROM
    || process.env.INGEST_ALERT_EMAIL
    || 'weller@pht.group'
  );
}

/**
 * @param {string} startIso ISO local datetime (Europe/Berlin)
 * @param {string} endIso
 * @returns {Promise<{ ok: boolean, busyTimes: { start: string, end: string }[], source: string, error?: string }>}
 */
export async function fetchServerCalendarBusy(startIso, endIso) {
  if (!hasServerCalendarConfig()) {
    return { ok: false, busyTimes: [], source: 'none', error: 'MS Graph nicht konfiguriert' };
  }

  const token = await getAppAccessToken();
  if (!token) {
    return { ok: false, busyTimes: [], source: 'graph-error', error: 'Graph-Token nicht verfügbar' };
  }

  const user = getCalendarUser();
  const params = new URLSearchParams({
    startDateTime: startIso,
    endDateTime: endIso,
    $select: 'start,end,showAs',
    $top: '250',
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user)}/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.timezone="Europe/Berlin"',
      },
      signal: AbortSignal.timeout(20000),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return {
      ok: false,
      busyTimes: [],
      source: 'graph-error',
      error: `Graph ${res.status}: ${err.slice(0, 120)}`,
    };
  }

  const data = await res.json();
  const busyTimes = (data.value ?? [])
    .filter((e) => e.showAs !== 'free')
    .map((e) => ({
      start: normalizeGraphDateTime(e.start?.dateTime),
      end: normalizeGraphDateTime(e.end?.dateTime),
    }))
    .filter((e) => e.start && e.end);

  return { ok: true, busyTimes, source: 'server-graph' };
}

/** @param {string | undefined} raw */
function normalizeGraphDateTime(raw) {
  if (!raw) return '';
  return raw.replace(/\.\d+$/, '').replace(/Z$/, '');
}

/**
 * @param {{ start: string, end: string }[]} manual
 * @param {{ start: string, end: string }[]} graph
 */
export function mergeBusyTimes(manual, graph) {
  return [...(graph ?? []), ...(manual ?? [])];
}
