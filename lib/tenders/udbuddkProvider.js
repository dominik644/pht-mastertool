/**
 * Denmark udbud.dk – BLOCKED: no public OCDS/REST API
 *
 * Research (2026-06): udbud.dk has no live JSON/OCDS feed. datafordeler.dk bietet
 * nur Grunddaten (CPR/BBR), kein Udbuds-API. KFST publiziert EU-Udbud als XLS:
 * kfst.dk/udbud/data-og-cases/udbudsdata. OpenTender DK Bulk (CC BY-NC-SA).
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
