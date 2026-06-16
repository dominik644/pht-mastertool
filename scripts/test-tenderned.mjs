/**
 * Strukturtest TenderNed (ohne echte XML-Credentials).
 * node scripts/test-tenderned.mjs
 */
import {
  fetchTenderNedTenders,
  getTenderNedCredentials,
  hasTenderNedXmlCredentials,
  isActivePublication,
  mapJsonPublication,
  parseCpvFromXml,
} from '../lib/tenders/tendernedProvider.js';

const sampleXml = `
<OBJECT_CONTRACT>
  <TITLE>Test contract</TITLE>
  <MAIN_CPV><CPV_CODE>45000000-7</CPV_CODE></MAIN_CPV>
  <ADDITIONAL_CPV><CPV_CODE>33140000-3</CPV_CODE></ADDITIONAL_CPV>
</OBJECT_CONTRACT>`;

const cpv = parseCpvFromXml(sampleXml);
if (!cpv.includes('45000000-7') || !cpv.includes('33140000-3')) {
  throw new Error(`parseCpvFromXml failed: ${cpv.join(',')}`);
}

const mapped = mapJsonPublication({
  publicatieId: '123',
  publicatieDatum: '2026-06-16',
  aanbestedingNaam: 'Testaanbesteding',
  opdrachtgeverNaam: 'Gemeente Test',
  sluitingsDatum: '2026-07-01T12:00:00',
  opdrachtBeschrijving: 'Hygiëne en reiniging',
  link: { href: 'https://www.tenderned.nl/aankondigingen/overzicht/123' },
}, ['85000000-9']);

if (mapped.countryCode !== 'NLD' || mapped.id !== 'tenderned-123') {
  throw new Error('mapJsonPublication mapping failed');
}

if (!isActivePublication({ aantalDagenTotSluitingsDatum: 5 })) {
  throw new Error('isActivePublication should accept future deadline');
}
if (isActivePublication({ typePublicatie: { code: 'AGO' }, aantalDagenTotSluitingsDatum: -10 })) {
  throw new Error('isActivePublication should reject expired AGO');
}

if (hasTenderNedXmlCredentials()) {
  console.warn('Hinweis: TENDERNED_API_* sind gesetzt – Live-XML-Test würde Credentials nutzen.');
} else {
  const creds = getTenderNedCredentials();
  if (creds.user || creds.pass) throw new Error('partial credentials should not count as configured');
}

const result = await fetchTenderNedTenders();
if (!Array.isArray(result.tenders)) throw new Error('fetchTenderNedTenders must return tenders array');
if (!result.source) throw new Error('missing source');

console.log('OK TenderNed structure test');
console.log(`  source: ${result.source}`);
console.log(`  tenders: ${result.tenders.length}`);
if (result.tenders[0]) {
  console.log(`  sample: ${result.tenders[0].title?.slice(0, 60)}`);
}
