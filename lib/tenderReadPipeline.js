/**
 * Server-side read pipeline: PHT match → 14-day deadline gate → strict score.
 * Uses the same matchesPHT + scoreTender rules as the client.
 */
import { matchesPHT, normalizeTender } from './tenders/utils.js';
import { scoreTender } from './phtScoring.js';
import { computeTenderProbabilities } from './tenderProbability.js';
import { hasFoodFacilityOpportunitySignal, hasEquipmentSignal } from './phtMatchRules.js';

const MIN_DEADLINE_BUFFER_LAUNCH_DATE = '2026-06-10';
const MIN_DEADLINE_BUFFER_DAYS = 14;

function addDaysIso(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MIN_DEADLINE_BUFFER_UNTIL = addDaysIso(MIN_DEADLINE_BUFFER_LAUNCH_DATE, MIN_DEADLINE_BUFFER_DAYS);

function getBerlinToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
}

function isMinDeadlineBufferActive(todayBerlin = getBerlinToday()) {
  return todayBerlin < MIN_DEADLINE_BUFFER_UNTIL;
}

function daysUntilSubmissionDeadline(deadline, todayBerlin = getBerlinToday()) {
  if (!deadline) return Number.POSITIVE_INFINITY;
  const dateOnly = String(deadline).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return Number.POSITIVE_INFINITY;
  const today = new Date(`${todayBerlin}T12:00:00Z`);
  const target = new Date(`${dateOnly}T12:00:00Z`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function meetsMinSubmissionLead(tender) {
  if (!isMinDeadlineBufferActive()) return true;
  const text = `${tender.title || ''} ${tender.description || ''}`;
  if (hasFoodFacilityOpportunitySignal(text) && hasEquipmentSignal(text)) return true;
  const deadline = tender.submissionDeadline || tender.deadline;
  if (!deadline) return true;
  return daysUntilSubmissionDeadline(deadline) >= MIN_DEADLINE_BUFFER_DAYS;
}

/**
 * @param {object} raw
 * @returns {object|null} Scored tender row or null if filtered out.
 */
export function processTenderForRead(raw) {
  const tender = normalizeTender(raw);
  if (!matchesPHT(tender)) return null;
  if (!meetsMinSubmissionLead(tender)) return null;
  const scoring = scoreTender(tender);
  if (scoring.score <= 0) return null;
  const probabilities = computeTenderProbabilities(tender, scoring);
  return {
    ...tender,
    score: scoring.score,
    recommendation: scoring.recommendation,
    category: scoring.category,
    scoreBreakdown: scoring.breakdown,
    ...probabilities,
  };
}
