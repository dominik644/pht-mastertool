import proposalHandler from '../lib/apiScheduleProposal.js';
import confirmHandler from '../lib/apiScheduleConfirm.js';
import busyHandler from '../lib/apiCalendarBusy.js';

function resolveRoute(req) {
  const routeParam = req.query?.route;
  if (routeParam === 'confirm' || routeParam === 'calendar-busy' || routeParam === 'proposal') {
    return routeParam;
  }
  const raw = req.url || '';
  const path = raw.split('?')[0];
  if (path.includes('schedule-confirm')) return 'confirm';
  if (path.includes('calendar-busy')) return 'calendar-busy';
  return 'proposal';
}

export default async function handler(req, res) {
  const route = resolveRoute(req);
  if (route === 'confirm') return confirmHandler(req, res);
  if (route === 'calendar-busy') return busyHandler(req, res);
  return proposalHandler(req, res);
}
