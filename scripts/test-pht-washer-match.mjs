#!/usr/bin/env node
/**
 * Smoke tests: Industriewaschanlagen vs. Gebäudereinigung
 * Run: node scripts/test-pht-washer-match.mjs
 */
import { matchesPHT } from '../lib/tenders/utils.js';
import { matchesPHTText } from '../lib/tenders/ocdsMapper.js';
import { scoreTender } from '../lib/phtScoring.js';
import { matchProductProfiles } from '../lib/productProfiles.js';

const EXAMPLES = [
  {
    label: 'Kistenwaschanlage Sonderbau',
    tender: {
      title: 'Lieferung und Installation Kistenwaschanlage Sonderbau',
      description: 'Industriewaschanlage für Kunststoffkisten in Lebensmittelbetrieb, CPV 42924700',
      cpvCodes: ['42924700'],
      budgetEur: 180000,
      region: 'DACH',
      industry: 'Food',
    },
    expectMatch: true,
  },
  {
    label: 'Behälterwaschanlage 1000 Liter',
    tender: {
      title: 'Behälterreinigungsanlage für 1000 Liter IBC-Container',
      description: 'Beschaffung Waschanlage Typ EKW inkl. Montage',
      cpvCodes: ['42996600'],
      budgetEur: 250000,
      region: 'DACH',
      industry: 'Production',
    },
    expectMatch: true,
  },
  {
    label: 'Palettenwascher EPW',
    tender: {
      title: 'Palettenwascher für Logistikzentrum',
      description: 'Lieferung Palettenreinigungsanlage EPW-45',
      cpvCodes: ['39711300'],
      budgetEur: 60000,
      region: 'DACH',
      industry: 'Production',
    },
    expectMatch: true,
  },
  {
    label: 'Mülltonnenwaschanlage',
    tender: {
      title: 'Mülltonnenwaschanlage für Kommune',
      description: 'Sonderbau Waschanlage für 240-Liter Mülltonnen',
      cpvCodes: ['42920000'],
      budgetEur: 120000,
      region: 'DACH',
      industry: 'Public',
    },
    expectMatch: true,
  },
  {
    label: 'Gebäudereinigung (Dienstleistung)',
    tender: {
      title: 'Unterhaltsreinigung und Gebäudereinigung Rathaus',
      description: 'Reinigung von Gebäuden, 3 Jahre Laufzeit, Reinigungsdienstleistung',
      cpvCodes: ['90911200'],
      budgetEur: 400000,
      region: 'DACH',
      industry: 'Public',
    },
    expectMatch: false,
  },
  {
    label: 'Facility Cleaning Service',
    tender: {
      title: 'Building cleaning services for hospital campus',
      description: 'Janitorial and office cleaning contract',
      cpvCodes: ['90910000'],
      budgetEur: 200000,
      region: 'Europa',
      industry: 'Hospital',
    },
    expectMatch: false,
  },
  {
    label: 'Gebäudereinigung MIT Waschanlage',
    tender: {
      title: 'Gebäudereinigung Produktionshalle inkl. Kistenwaschanlage',
      description: 'Lieferung Behälterwaschanlage und Unterhaltsreinigung Nebengebäude',
      cpvCodes: ['90911000', '42924700'],
      budgetEur: 300000,
      region: 'DACH',
      industry: 'Food',
    },
    expectMatch: true,
  },
];

let failed = 0;
console.log('PHT Waschmaschinen-Matching – Vor/Nachher Smoke Tests\n');

for (const ex of EXAMPLES) {
  const match = matchesPHT(ex.tender);
  const textMatch = matchesPHTText(`${ex.tender.title} ${ex.tender.description}`, ex.tender.cpvCodes);
  const scored = scoreTender(ex.tender);
  const profiles = matchProductProfiles(`${ex.tender.title} ${ex.tender.description}`);
  const topProfile = profiles[0]?.name ?? '—';
  const ok = match === ex.expectMatch && textMatch === ex.expectMatch;

  const icon = ok ? '✓' : '✗';
  console.log(`${icon} ${ex.label}`);
  console.log(`   Match: ${match} (erwartet: ${ex.expectMatch}) | Score: ${scored.score} ${scored.recommendation}`);
  console.log(`   Profil: ${topProfile}`);
  if (!ok) {
    failed += 1;
    console.log('   FEHLER: Match weicht ab');
  }
  console.log('');
}

if (failed > 0) {
  console.error(`${failed} Test(s) fehlgeschlagen`);
  process.exit(1);
}
console.log('Alle Tests bestanden.');
