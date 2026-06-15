/**
 * Austria offenevergabe.at / offenevergaben.at – kein öffentliches OCDS-API
 *
 * Research (2026-06-15): offenevergabe.at nicht erreichbar; offenevergaben.at /api/* → 404.
 * data.open-contracting.org (AT) liefert keine freie Live-API für aktive Ausschreibungen.
 * Live-Abdeckung: BBG HTML-Parser (bbgProvider.js). TED DACH-Queries ergänzend.
 */

export async function fetchOffenevergabenAtTenders() {
  return {
    tenders: [],
    source: 'offenevergabe-at-stub',
    live: false,
    error: 'offenevergabe.at: kein öffentliches OCDS-API (BBG live)',
  };
}
