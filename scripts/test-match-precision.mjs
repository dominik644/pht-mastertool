#!/usr/bin/env node
/**
 * Test: Ausrüstung vs. Reinigungsdienstleistung
 * Run: node scripts/test-match-precision.mjs
 */
import { matchesPHT } from '../lib/tenders/utils.js';
import { matchesPHTText } from '../lib/tenders/ocdsMapper.js';
import { scoreTender } from '../lib/phtScoring.js';
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
    expectMinScore: 30,
  },
];

let failed = 0;

console.log('=== PHT Match Precision Tests ===\n');

for (const c of CASES) {
  const tender = {
    title: c.title,
    description: '',
    keywords: [],
    cpvCodes: c.cpvCodes,
    country: 'DE',
    region: 'DACH',
    industry: 'Public',
    budgetEur: 80000,
    submissionDeadline: '2026-12-31',
  };

  const matchUtils = matchesPHT(tender);
  const matchText = matchesPHTText(c.title, c.cpvCodes);
  const score = scoreTender(tender).score;
  const pureService = isPureCleaningService(c.title);
  const equip = hasEquipmentSignal(c.title);

  const matchOk = matchUtils === c.expectMatch && matchText === c.expectMatch;
  const scoreOk = c.expectMinScore != null
    ? score >= c.expectMinScore
    : score <= (c.expectMaxScore ?? 100);

  const status = matchOk && scoreOk ? 'PASS' : 'FAIL';
  if (status === 'FAIL') failed += 1;

  console.log(`${status} | ${c.label}`);
  console.log(`  Titel: ${c.title}`);
  console.log(`  match=${matchUtils}/${matchText} (erw: ${c.expectMatch}) | score=${score} | service=${pureService} | equip=${equip}`);
  if (!matchOk) console.log('  → Match-Erwartung verfehlt');
  if (!scoreOk) console.log(`  → Score-Erwartung verfehlt (min=${c.expectMinScore ?? '-'}, max=${c.expectMaxScore ?? '-'})`);
  console.log('');
}

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log(`Alle ${CASES.length} Tests bestanden.`);
