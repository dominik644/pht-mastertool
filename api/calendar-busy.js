import { fetchServerCalendarBusy, hasServerCalendarConfig } from '../lib/calendarBusyTimes.js';

function defaultRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);
  end.setHours(23, 59, 59, 0);
  const fmt = (d) => d.toISOString().slice(0, 19);
  return { start: fmt(start), end: fmt(end) };
}

/**
 * GET/POST /api/calendar-busy
 * Query/body: { start?, end? } ISO local datetimes
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ configured: hasServerCalendarConfig() });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const defaults = defaultRange();
  const start = req.query?.start || req.body?.start || defaults.start;
  const end = req.query?.end || req.body?.end || defaults.end;

  if (!hasServerCalendarConfig()) {
    return res.status(200).json({
      ok: false,
      configured: false,
      busyTimes: [],
      source: 'none',
      message: 'MS Graph Kalender nicht konfiguriert (MS_GRAPH_* env)',
    });
  }

  const result = await fetchServerCalendarBusy(start, end);
  return res.status(result.ok ? 200 : 502).json({
    configured: true,
    ...result,
    range: { start, end },
  });
}
