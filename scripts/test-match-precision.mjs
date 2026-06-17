#!/usr/bin/env node
/**
 * Test: Ausrüstung vs. Reinigungsdienstleistung
 * Run: node scripts/test-match-precision.mjs
 */
import { matchesPHT } from '../lib/tenders/utils.js';
import { matchesPHTText } from '../lib/tenders/ocdsMapper.js';
import { scoreTender } from '../lib/phtScoring.js';
import { scoreCatalogMatch } from '../lib/phtProductMatch.js';
import { isPureCleaningService, hasEquipmentSignal } from '../lib/phtMatchRules.js';

const CASES = [
  {
    label: 'Schaumstation Krankenhaus Eingang',
    title: 'Lieferung und Montage Schaumstationen für Eingangsbereich Krankenhaus',
    cpvCodes: ['42996600'],
    expectMatch: true,
    expectMinScore: 40,
  },
  {
    label: 'Niederdruck Hauptstation',
    title: 'Beschaffung Niederdruck-Hauptstation mit Satellitenstationen Werkstatt',
    cpvCodes: ['44614300'],
    expectMatch: true,
    expectMinScore: 40,
  },
  {
    label: 'Besen und Bürsten Beschaffung',
    title: 'Rahmenvereinbarung Reinigungsbedarf Besen Bürsten Kehrschaufeln',
    cpvCodes: ['39830000'],
    expectMatch: true,
    expectMinScore: 30,
  },
  {
    label: 'Spinde Umkleide',
    title: 'Lieferung Garderobenspinde und Wertfachschränke Umkleidebereich',
    cpvCodes: ['39134000'],
    expectMatch: true,
    expectMinScore: 40,
  },
  {
    label: 'Reinigung Schulgebäude 3 Jahre',
    title: 'Reinigung Schulgebäude – Unterhaltsreinigung für 3 Jahre',
    cpvCodes: ['90910000'],
    expectMatch: false,
    expectMaxScore: 15,
  },
  {
    label: 'Gebäudereinigung Vertrag',
    title: 'Gebäudereinigung und Unterhaltsreinigung Verwaltungsgebäude',
    cpvCodes: ['90911000'],
    expectMatch: false,
    expectMaxScore: 10,
  },
  {
    label: 'FM Reinigung Dienstleistung',
    title: 'Facility Management Reinigung – Reinigungsdienstleistungen Bürokomplex',
    cpvCodes: ['90919000'],
    expectMatch: false,
    expectMaxScore: 10,
  },
  {
    label: 'Hygienestation mit Equipment-CPV',
    title: 'Hygienestation Sohlenreiniger Handdesinfektion Produktionseingang',
    cpvCodes: ['90910000'],
    expectMatch: true,
    expectMinScore: 40,
  },
  {
    label: 'Windeln Ausschluss',
    title: 'Lieferung Inkontinenzwindeln Krankenhaus',
    cpvCodes: ['33141100'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Passenger Transport DPS UK',
    title: 'Provision for a Dynamic Purchasing System for Passenger Transport Services',
    description: 'Northumbria Healthcare NHS Foundation Trust passenger transport minibus taxi operators',
    cpvCodes: ['60000000'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Personenbeförderung Linienverkehr',
    title: 'Vergabe von Personenbeförderungsleistungen im Linienverkehr mit Kraftfahrzeugen',
    description: 'Öffentlicher Personennahverkehr Linienbündel Busverkehr',
    cpvCodes: ['60112000'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Kistenwaschanlage Sonderbau',
    title: 'Lieferung und Installation Kistenwaschanlage Sonderbau',
    description: 'Industriewaschanlage für Kunststoffkisten',
    cpvCodes: ['42924700'],
    expectMatch: true,
    expectMinScore: 70,
  },
  {
    label: 'Spind Beschaffung',
    title: 'Beschaffung Umkleidespinde für Feuerwehr',
    description: 'Lieferung und Montage Spindschränke',
    cpvCodes: ['39134000'],
    expectMatch: true,
    expectMinScore: 70,
  },
  {
    label: 'Besen Beschaffung',
    title: 'Rahmenvereinbarung Besen Bürsten Kehrschaufeln Reinigungsbedarf',
    cpvCodes: ['39830000'],
    expectMatch: true,
    expectMinScore: 70,
  },
  {
    label: 'Generic Framework Agreement',
    title: 'Framework Agreement for the Provision of Services',
    description: 'Multi-supplier framework for generic services',
    cpvCodes: ['79900000'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'IT Consulting Services',
    title: 'IT Consulting Services and Managed Services Framework',
    cpvCodes: ['72000000'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Hospital Catering',
    title: 'Hospital Catering Services and Meal Provision',
    cpvCodes: ['55520000'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Windeln Diapers',
    title: 'Supply of Adult Diapers and Incontinence Products',
    cpvCodes: ['33141100'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Building Cleaning Service',
    title: 'Building Cleaning and Janitorial Services Contract',
    cpvCodes: ['90910000'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Passenger Transport',
    title: 'Passenger Transport Services Local Bus Operator',
    cpvCodes: ['60112000'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Schaumstation GO-Qualität',
    title: 'Lieferung Schaumstationen Hygienestation Produktionseingang',
    cpvCodes: ['42996600'],
    expectMatch: true,
    expectMinScore: 70,
  },
  {
    label: 'Umbau Lebensmittelbetriebe GO',
    title: 'Ausschreibungen für den Umbau von Lebensmittelbetrieben Priorität A',
    description: 'Sanierung und Umbau der Produktionshallen',
    cpvCodes: ['45210000'],
    industry: 'Food',
    budgetEur: 500000,
    expectMatch: true,
    expectMinScore: 70,
  },
  {
    label: 'Neubau Lebensmittelbetrieb',
    title: 'Bauarbeiten und Generalunternehmerleistung Neubau Lebensmittelbetrieb',
    cpvCodes: ['45210000'],
    industry: 'Food',
    expectMatch: true,
    expectMinScore: 40,
  },
  {
    label: 'Food processing facility renovation EN',
    title: 'Renovation of food processing facility – construction works',
    cpvCodes: ['45210000'],
    industry: 'Food',
    expectMatch: true,
    expectMinScore: 40,
  },
  {
    label: 'Generische Deckensanierung',
    title: 'Deckensanierung Verwaltungsgebäude Rathaus',
    cpvCodes: ['45210000'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Neubau Schule ohne Food',
    title: 'Neubau Grundschule mit Sporthalle',
    cpvCodes: ['45214200'],
    expectMatch: false,
    expectMaxScore: 0,
  },
  {
    label: 'Kistenwaschanlage Lebensmittelbetrieb',
    title: 'Lieferung und Installation Kistenwaschanlage für Lebensmittelbetrieb',
    description: 'Industriewaschanlage Kunststoffkisten',
    cpvCodes: ['42924700'],
    industry: 'Food',
    expectMatch: true,
    expectMinScore: 70,
  },
  {
    label: 'Schaumstationen Lebensmittelproduktion',
    title: 'Lieferung Schaumstationen und Hygienestationen Lebensmittelproduktion',
    cpvCodes: ['42996600'],
    industry: 'Food',
    expectMatch: true,
    expectMinScore: 40,
  },
];

let failed = 0;

console.log('=== PHT Match Precision Tests ===\n');

for (const c of CASES) {
  const tender = {
    title: c.title,
    description: c.description ?? '',
    keywords: [],
    cpvCodes: c.cpvCodes,
    country: 'DE',
    region: 'DACH',
    industry: c.industry ?? 'Public',
    budgetEur: c.budgetEur ?? 80000,
    submissionDeadline: '2026-12-31',
  };

  const matchUtils = matchesPHT(tender);
  const matchText = matchesPHTText(`${c.title} ${c.description ?? ''}`, c.cpvCodes);
  const score = scoreTender(tender).score;
  const catalog = scoreCatalogMatch(`${c.title} ${c.description ?? ''}`);
  const pureService = isPureCleaningService(`${c.title} ${c.description ?? ''}`);
  const equip = hasEquipmentSignal(`${c.title} ${c.description ?? ''}`);

  const matchOk = matchUtils === c.expectMatch && matchText === c.expectMatch;
  const scoreOk = c.expectMinScore != null
    ? score >= c.expectMinScore
    : score <= (c.expectMaxScore ?? 100);

  const status = matchOk && scoreOk ? 'PASS' : 'FAIL';
  if (status === 'FAIL') failed += 1;

  console.log(`${status} | ${c.label}`);
  console.log(`  Titel: ${c.title}`);
  console.log(`  match=${matchUtils}/${matchText} (erw: ${c.expectMatch}) | score=${score} | catalog=${catalog.catalogScore} | service=${pureService} | equip=${equip}`);
  if (catalog.topArticles[0]) {
    console.log(`  topArtikel: ${catalog.topArticles[0].name} (${catalog.topArticles[0].articleNumber})`);
  }
  if (!matchOk) console.log('  → Match-Erwartung verfehlt');
  if (!scoreOk) console.log(`  → Score-Erwartung verfehlt (min=${c.expectMinScore ?? '-'}, max=${c.expectMaxScore ?? '-'})`);
  console.log('');
}

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log(`Alle ${CASES.length} Tests bestanden.`);
