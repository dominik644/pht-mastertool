#!/usr/bin/env node
/**
 * Test: read-path pipeline filters stale / wrong tenders on load.
 * Run: node scripts/test-tender-pipeline.mjs
 */
import { matchesPHT } from '../lib/tenders/utils.js';
import { scoreTender } from '../lib/phtScoring.js';

const EXCLUDE_CASES = [
  {
    label: 'Windeln (cached GO score)',
    tender: {
      id: 'stale-diaper-1',
      title: 'Lieferung Inkontinenzwindeln Krankenhaus',
      description: 'Versorgung mit Windeln und Inkontinenzprodukten',
      keywords: ['hospital', 'hygiene'],
      cpvCodes: ['33141100'],
      country: 'DE',
      region: 'DACH',
      industry: 'Hospital',
      budgetEur: 120000,
      score: 72,
      recommendation: 'GO',
      category: 'C',
    },
    expectVisible: false,
  },
  {
    label: 'Gebäudereinigung (cached PRÜFEN)',
    tender: {
      id: 'stale-cleaning-1',
      title: 'Gebäudereinigung und Unterhaltsreinigung Verwaltungsgebäude',
      description: 'Reinigungsdienstleistungen für 3 Jahre',
      keywords: ['reinigung', 'cleaning'],
      cpvCodes: ['90911000'],
      country: 'DE',
      region: 'DACH',
      industry: 'Public',
      budgetEur: 250000,
      score: 55,
      recommendation: 'PRÜFEN',
      category: 'C',
    },
    expectVisible: false,
  },
  {
    label: 'Schaumstation (valid equipment)',
    tender: {
      id: 'valid-equip-1',
      title: 'Lieferung und Montage Schaumstationen Krankenhaus Eingang',
      description: 'Beschaffung Schaumstationen mit Niederdruckanlage',
      keywords: ['schaumstation', 'hygiene'],
      cpvCodes: ['42996600'],
      country: 'DE',
      region: 'DACH',
      industry: 'Hospital',
      budgetEur: 80000,
      score: 10,
      recommendation: 'NO-GO',
      category: 'B',
    },
    expectVisible: true,
  },
];

let failed = 0;

console.log('=== Tender Read-Path Filter Tests ===\n');

for (const c of EXCLUDE_CASES) {
  const match = matchesPHT(c.tender);
  const fresh = scoreTender(c.tender);
  const ok = c.expectVisible
    ? match && fresh.score >= 40
    : !match && fresh.score === 0;

  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${c.label}`);
  console.log(`  cached: score=${c.tender.score} ${c.tender.recommendation}`);
  console.log(`  fresh:  match=${match} score=${fresh.score} ${fresh.recommendation}`);
  console.log('');
}

if (failed > 0) {
  console.error(`${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log(`Alle ${EXCLUDE_CASES.length} Tests bestanden.`);
