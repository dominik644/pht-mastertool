#!/usr/bin/env node
/**
 * Tests for news lead freshness/relevance filters.
 * Run: node scripts/test-news-excluded-filters.mjs
 */
import {
  filterNewsLeads,
  isNewsLeadFresh,
  isNewsLeadRelevant,
  NEWS_MAX_AGE_DAYS,
} from '../lib/newsLeadFilters.js';

const now = new Date('2026-06-19T12:00:00.000Z').getTime();

const cases = [
  {
    label: 'fresh + relevant mega expansion',
    lead: {
      publishedAt: '2026-06-01T08:00:00.000Z',
      relevanceScore: 60,
      isMegaExpansion: true,
      topSegment: 'food-facility-construction',
    },
    expect: true,
  },
  {
    label: 'old article from 2023',
    lead: {
      publishedAt: '2023-11-16T08:00:00.000Z',
      relevanceScore: 80,
      isMegaExpansion: true,
      topSegment: 'healthcare',
    },
    expect: false,
  },
  {
    label: 'fresh but low relevance score',
    lead: {
      publishedAt: '2026-06-10T08:00:00.000Z',
      relevanceScore: 10,
      matchedIndustries: ['food'],
    },
    expect: false,
  },
  {
    label: 'fresh score without PHT segment signal',
    lead: {
      publishedAt: '2026-06-10T08:00:00.000Z',
      relevanceScore: 40,
      matchedKeywords: ['milliardeninvestition'],
    },
    expect: false,
  },
];

let failed = 0;

console.log('=== News Lead Filter Tests ===\n');

for (const c of cases) {
  const fresh = isNewsLeadFresh(c.lead.publishedAt, NEWS_MAX_AGE_DAYS, now);
  const relevant = isNewsLeadRelevant(c.lead);
  const ok = (fresh && relevant) === c.expect;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${c.label}`);
  console.log(`  fresh=${fresh} relevant=${relevant}`);
}

const filtered = filterNewsLeads(cases.map((c) => c.lead), { now });
const expectedCount = cases.filter((c) => c.expect).length;
if (filtered.length !== expectedCount) {
  failed += 1;
  console.log(`FAIL | filterNewsLeads count expected ${expectedCount}, got ${filtered.length}`);
} else {
  console.log(`PASS | filterNewsLeads count=${filtered.length}`);
}

console.log(`\n${failed === 0 ? 'All tests passed.' : `${failed} test(s) failed.`}`);
process.exit(failed === 0 ? 0 : 1);
