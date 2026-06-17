#!/usr/bin/env node
/**
 * Test: tender probability metrics (server-side module).
 * Run: node scripts/test-tender-probability.mjs
 */
import { scoreTender } from '../lib/phtScoring.js';
import {
  computeTenderProbabilities,
  computeNewsLeadProbabilities,
  portfolioMatchProb,
  winProbability,
  urgencyScore,
  revenueTier,
  overallOpportunityScore,
} from '../lib/tenderProbability.js';
import { processTenderForRead } from '../lib/tenderReadPipeline.js';

const EQUIP_TENDER = {
  id: 'prob-equip-1',
  title: 'Lieferung Schaumstationen und Niederdruckanlage Krankenhaus',
  description: 'Beschaffung Hygienestationen mit Schaumstationen für OP-Bereich',
  keywords: ['schaumstation', 'hygiene', 'niederdruck'],
  cpvCodes: ['42996600'],
  country: 'DE',
  region: 'DACH',
  industry: 'Hospital',
  budgetEur: 120000,
  submissionDeadline: '2026-08-15',
};

let failed = 0;

function assert(cond, label) {
  if (!cond) {
    failed += 1;
    console.log(`FAIL | ${label}`);
    return;
  }
  console.log(`PASS | ${label}`);
}

console.log('=== Tender Probability Tests ===\n');

const scoring = scoreTender(EQUIP_TENDER);
const probs = computeTenderProbabilities(EQUIP_TENDER, scoring);

assert(probs.portfolioMatchProb >= 0 && probs.portfolioMatchProb <= 100, 'portfolioMatchProb in range');
assert(probs.winProbability >= 0 && probs.winProbability <= 100, 'winProbability in range');
assert(probs.urgencyScore >= 0 && probs.urgencyScore <= 100, 'urgencyScore in range');
assert(['low', 'medium', 'high'].includes(probs.revenueTier), 'revenueTier valid');
assert(probs.overallOpportunityScore >= 0 && probs.overallOpportunityScore <= 100, 'overallOpportunityScore in range');
assert(probs.portfolioMatchProb > 30, 'equipment tender has meaningful portfolio match');

const processed = processTenderForRead(EQUIP_TENDER);
assert(processed?.portfolioMatchProb != null, 'read pipeline attaches portfolioMatchProb');
assert(processed?.winProbability != null, 'read pipeline attaches winProbability');
assert(processed?.overallOpportunityScore != null, 'read pipeline attaches overallOpportunityScore');

const newsBase = {
  relevanceScore: 72,
  isMegaExpansion: true,
  matchedKeywords: ['neubau', 'investition', 'expansion'],
  matchedIndustries: ['food', 'manufacturing'],
  projectType: 'Neubau',
  portfolioSegments: [{ name: 'Lebensmittel-Anlagenbau', score: 8 }],
};
const newsProbs = computeNewsLeadProbabilities(newsBase);
assert(newsProbs.tenderLikelihood >= 40, 'news tenderLikelihood reasonable for expansion');
assert(newsProbs.phtFitProb >= 30, 'news phtFitProb from segment');

const urgent = urgencyScore({ submissionDeadline: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10) });
const relaxed = urgencyScore({ submissionDeadline: '2027-01-01' });
assert(urgent > relaxed, 'urgency higher for near deadlines');

const dachWin = winProbability({ ...EQUIP_TENDER, region: 'DACH' }, scoring);
const afWin = winProbability({ ...EQUIP_TENDER, region: 'Afrika' }, scoring);
assert(dachWin >= afWin, 'DACH proximity boosts win probability');

console.log(`\nSample metrics: Passung=${probs.portfolioMatchProb}% Gewinn=${probs.winProbability}% Gesamt=${probs.overallOpportunityScore}%`);

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log(`\nAlle Tests bestanden.`);
