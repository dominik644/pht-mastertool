#!/usr/bin/env node
/**
 * Run curated lead discovery (RSS/Atom/Google News) and write public/data/leads/discovered-leads.json
 * Usage: node scripts/run-lead-discovery.mjs
 */
import { runLeadDiscovery, getLeadDiscoverySourceCount } from '../lib/leadDiscovery.js';

const result = await runLeadDiscovery({ write: true });
console.log(`Lead discovery complete:`);
console.log(`  sources=${getLeadDiscoverySourceCount()} fetched=${result.sourceCount}`);
console.log(`  leads=${result.leadCount} tedQueries=${result.tedQueryCount}`);
console.log(`  written: public/data/leads/discovered-leads.json`);
