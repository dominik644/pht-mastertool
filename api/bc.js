import { guardAppAuth } from '../lib/appAuth.js';
import apiBcSyncHandler from '../lib/apiBcSync.js';
import apiBcDocumentsHandler from '../lib/apiBcDocuments.js';
import apiBcSalespeopleHandler from '../lib/apiBcSalespeople.js';
import apiBcPurchaseActivityHandler from '../lib/apiBcPurchaseActivity.js';

function resolveRoute(req) {
  const routeParam = req.query?.route;
  if (
    routeParam === 'sync'
    || routeParam === 'documents'
    || routeParam === 'salespeople'
    || routeParam === 'purchase-activity'
  ) {
    return routeParam;
  }
  const original = String(req.headers?.['x-vercel-original-url'] || req.headers?.['x-original-url'] || req.url || '');
  const path = original.split('?')[0];
  if (path.includes('bc-documents')) return 'documents';
  if (path.includes('bc-salespeople')) return 'salespeople';
  if (path.includes('bc-purchase-activity')) return 'purchase-activity';
  return 'sync';
}

export default async function handler(req, res) {
  const guard = guardAppAuth(req, res);
  if (!guard.ok) return;

  const route = resolveRoute(req);
  if (route === 'documents') return apiBcDocumentsHandler(req, res);
  if (route === 'salespeople') return apiBcSalespeopleHandler(req, res);
  if (route === 'purchase-activity') return apiBcPurchaseActivityHandler(req, res);
  return apiBcSyncHandler(req, res);
}
