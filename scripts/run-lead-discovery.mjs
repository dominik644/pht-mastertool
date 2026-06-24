#!/usr/bin/env node
/**
 * Run curated lead discovery (RSS/Atom/Google News) + news intelligence.
 * Writes public/data/leads/discovered-leads.json and news-leads.json
 * Usage: node scripts/run-lead-discovery.mjs
 */
import { runLeadDiscovery, getLeadDiscoverySourceCount } from '../lib/leadDiscovery.js';
import { runNewsIntelligence, getNewsIntelligenceSourceCount } from '../lib/newsIntelligence.js';

const [leadResult, newsResult] = await Promise.all([
  runLeadDiscovery({ write: true }),
  runNewsIntelligence({ write: true }),
]);

console.log('Lead discovery complete:');
console.log(`  portfolio sources=${getLeadDiscoverySourceCount()} fetched=${leadResult.sourceCount}`);
console.log(`  portfolio leads=${leadResult.leadCount} tedQueries=${leadResult.tedQueryCount}`);
console.log(`  written: public/data/leads/discovered-leads.json`);

console.log('News intelligence complete:');
console.log(`  news sources=${getNewsIntelligenceSourceCount()} fetched=${newsResult.sourceCount}`);
console.log(`  news leads=${newsResult.leadCount} mega-expansion=${newsResult.megaExpansionCount}`);
console.log(`  uk-planning=${newsResult.ukPlanningCount ?? 0} sub-gu=${newsResult.subGuCount ?? 0} opposition=${newsResult.oppositionCount ?? 0}`);
console.log(`  written: public/data/leads/news-leads.json`);

if (newsResult.leads.length > 0) {
  console.log('  sample headlines:');
  for (const lead of newsResult.leads.slice(0, 3)) {
    console.log(`    [${lead.relevanceScore}${lead.isMegaExpansion ? ' MEGA' : ''}] ${lead.title.slice(0, 80)}`);
  }
}
