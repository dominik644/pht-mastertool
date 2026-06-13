/**
 * OpenTender HU/RO Bulk-Evaluierung (CC BY-NC-SA 4.0)
 *
 * Ausführen: node scripts/eval-opentender-hu-ro.mjs
 *
 * Ergebnis: OpenTender liefert keinen öffentlichen Live-API-Zugang (403 auf /api/{CC}/notices).
 * Daten sind als periodische OCDS-Bulk-Downloads auf opentender.eu verfügbar – Lizenz
 * BY-NC-SA schließt kommerzielle Vercel-Nutzung ohne Partnerlizenz aus.
 *
 * Empfehlung PHT:
 * - HU/RO interim: TED buyer-country Filter (bereits in TED_COUNTRY_QUERIES)
 * - Vollabdeckung: Offline-Batch (Supabase ingest) mit OpenTender-Bulk ODER Partnerzugang EKR/SEAP
 */

const COUNTRIES = ['HU', 'RO'];

const probes = [
  (cc) => `https://opentender.eu/api/${cc}/notices?limit=3`,
  (cc) => `https://opentender.eu/${cc.toLowerCase()}/api/notices?limit=3`,
  (cc) => `https://data.open-contracting.org/en/publication/130`, // Hungary registry
];

console.log('OpenTender HU/RO Evaluation –', new Date().toISOString());
console.log('License: CC BY-NC-SA 4.0 (non-commercial without agreement)\n');

for (const cc of COUNTRIES) {
  console.log(`=== ${cc} ===`);
  for (const build of probes) {
    const url = typeof build === 'function' ? build(cc) : build;
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      console.log(`  ${res.status} ${url.split('?')[0]}`);
      if (res.status === 200 && ct.includes('json')) {
        console.log('    preview:', text.slice(0, 120).replace(/\s+/g, ' '));
      }
    } catch (e) {
      console.log(`  ERR ${url}: ${e.message}`);
    }
  }
  console.log(`  Bulk portal: https://opentender.eu/${cc.toLowerCase()}`);
  console.log('');
}

console.log('Fazit: Kein Live-API für Vercel. Batch-Ingest (Phase B) oder TED-only.\n');
