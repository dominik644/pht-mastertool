#!/usr/bin/env node
/**
 * Verify production bundle deployment and startup fix markers.
 * Usage: node scripts/verify-startup.mjs [url]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PROD_URL = process.argv[2] || 'https://pht-mastertool.vercel.app';
const MARKERS = [
  'markCacheSessionWarmed',
  'isCacheDisabled',
  'matching-keywords',
];

async function checkProduction() {
  const html = await fetch(PROD_URL, { signal: AbortSignal.timeout(15000) }).then((r) => r.text());
  const scriptMatch = html.match(/assets\/index-[\w-]+\.js/);
  if (!scriptMatch) {
    console.log('PRODUCTION: no index bundle found in HTML');
    return;
  }
  const bundlePath = scriptMatch[0];
  const js = await fetch(`${PROD_URL}/${bundlePath}`, { signal: AbortSignal.timeout(20000) }).then((r) => r.text());
  console.log(`PRODUCTION bundle: ${bundlePath} (${(js.length / 1024).toFixed(0)} KB)`);
  for (const m of MARKERS) {
    console.log(`  ${m}: ${js.includes(m) ? 'YES' : 'no'}`);
  }
}

function checkLocalDist() {
  const assetsDir = join(process.cwd(), 'dist', 'assets');
  let files;
  try {
    files = readdirSync(assetsDir);
  } catch {
    console.log('LOCAL: dist/ not built – run npm run build');
    return;
  }
  const indexJs = files.filter((f) => f.startsWith('index-') && f.endsWith('.js') && !f.includes('worker'));
  console.log(`LOCAL chunks: ${files.length} files`);
  for (const f of indexJs) {
    const js = readFileSync(join(assetsDir, f), 'utf8');
    console.log(`  ${f}: ${(js.length / 1024).toFixed(0)} KB`);
    for (const m of MARKERS) {
      if (js.includes(m)) console.log(`    contains ${m}`);
    }
  }
  for (const f of files.filter((n) => n.startsWith('matching-'))) {
    const size = readFileSync(join(assetsDir, f), 'utf8').length;
    console.log(`  ${f}: ${(size / 1024).toFixed(0)} KB (lazy)`);
  }
}

console.log('=== Startup verification ===\n');
checkLocalDist();
console.log('');
await checkProduction();
