/**
 * Denmark udbud.dk – BLOCKED: no public OCDS/REST API
 *
 * Research (2026-06): udbud.dk has no live JSON/OCDS feed. Konkurrence- og
 * Forbrugerstyrelsen publishes EU-tender statistics as downloadable XLS only
 * (kfst.dk/udbud/data-og-cases/udbudsdata). OpenTender DK bulk at opentender.eu/dk
 * (CC BY-NC-SA, semi-annual) is not a live API suitable for Vercel.
 */

export async function fetchUdbudDkTenders() {
  console.warn('[udbud.dk] Keine öffentliche Live-API – nationaler DK-Feed ausstehend');
  return {
    tenders: [],
    source: 'udbuddk-stub',
    live: false,
    error: 'udbud.dk: kein öffentliches OCDS/REST-API',
  };
}
