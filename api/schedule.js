import { guardAppAuth } from '../lib/appAuth.js';
import proposalHandler from '../lib/apiScheduleProposal.js';
import confirmHandler from '../lib/apiScheduleConfirm.js';
import busyHandler from '../lib/apiCalendarBusy.js';
import wishHandler from '../lib/apiScheduleWish.js';
import wishAcceptHandler from '../lib/apiScheduleWishAccept.js';
import customRequestsHandler from '../lib/apiScheduleCustomRequests.js';
import sendHandler from '../lib/apiScheduleSend.js';
import emlHandler from '../lib/apiScheduleEml.js';
import followUpCronHandler from '../lib/apiScheduleFollowUpCron.js';

function resolveRoute(req) {
  const routeParam = req.query?.route;
  if (
    routeParam === 'confirm'
    || routeParam === 'calendar-busy'
    || routeParam === 'proposal'
    || routeParam === 'wish'
    || routeParam === 'wish-accept'
    || routeParam === 'custom-requests'
    || routeParam === 'send'
    || routeParam === 'eml'
    || routeParam === 'follow-up-cron'
  ) {
    return routeParam;
  }
  const original = String(req.headers['x-vercel-original-url'] || req.headers['x-original-url'] || '');
  const raw = original || req.url || '';
  const path = raw.split('?')[0];
  if (path.includes('schedule-wish-accept')) return 'wish-accept';
  if (path.includes('schedule-custom-requests')) return 'custom-requests';
  if (path.includes('schedule-send')) return 'send';
  if (path.includes('schedule-eml')) return 'eml';
  if (path.includes('book/wish') || path.includes('schedule-wish')) return 'wish';
  if (path.includes('schedule-confirm')) return 'confirm';
  if (path.includes('calendar-busy')) return 'calendar-busy';
  if (path.includes('schedule-follow-up-cron')) return 'follow-up-cron';
  if (path.includes('schedule-proposal')) return 'proposal';
  if (req.method === 'POST' && path.includes('wish')) return 'wish';
  if (req.method === 'POST') return 'proposal';
  if (req.query?.token && req.method === 'GET') {
    // wish tokens have slotId 'wish' – route resolver can't decode here; default confirm for GET+token
    return 'confirm';
  }
  return 'calendar-busy';
}

export default async function handler(req, res) {
  const route = resolveRoute(req);
  if (route === 'follow-up-cron') return followUpCronHandler(req, res);
  const publicRoutes = new Set(['confirm', 'wish', 'wish-accept']);
  if (!publicRoutes.has(route)) {
    const guard = guardAppAuth(req, res);
    if (!guard.ok) return;
  }
  if (route === 'confirm') return confirmHandler(req, res);
  if (route === 'wish') return wishHandler(req, res);
  if (route === 'wish-accept') return wishAcceptHandler(req, res);
  if (route === 'custom-requests') return customRequestsHandler(req, res);
  if (route === 'send') return sendHandler(req, res);
  if (route === 'eml') return emlHandler(req, res);
  if (route === 'calendar-busy') return busyHandler(req, res);
  return proposalHandler(req, res);
}
