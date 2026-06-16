/**
 * Führt alle Bulk-Ingest-Skripte nacheinander aus (täglich via GitHub Actions).
 *   node scripts/run-all-bulk-jobs.mjs
 *   npm run bulk:ingest
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BULK_DIR = path.join(ROOT, 'public', 'data', 'bulk');

const JOBS = [
  ['bulk-ingest-opentender.mjs', ['--countries', 'HU,RO,PL']],
  ['bulk-ingest-ireland.mjs', []],
  ['bulk-ingest-eojn.mjs', []],
  ['bulk-ingest-anac.mjs', []],
  ['bulk-ingest-pcsp.mjs', []],
];

function run(script, args) {
  return new Promise((resolve, reject) => {
    const file = path.join(ROOT, 'scripts', script);
    console.log(`\n▶ node scripts/${script} ${args.join(' ')}`);
    const child = spawn(process.execPath, [file, ...args], { cwd: ROOT, stdio: 'inherit' });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${script} exit ${code}`))));
  });
}

function summarizeArtifacts() {
  const files = fs.readdirSync(BULK_DIR).filter((f) => f.endsWith('.json'));
  console.log('\n── Bulk-Artefakte ──');
  for (const file of files) {
    try {
      const payload = JSON.parse(fs.readFileSync(path.join(BULK_DIR, file), 'utf8'));
      const at = payload.fetchedAt || payload.generatedAt || '—';
      console.log(`  ${file}: ${payload.matched ?? payload.tenders?.length ?? 0} Treffer, fetchedAt=${at}`);
    } catch (err) {
      console.log(`  ${file}: FEHLER (${err.message})`);
    }
  }
}

console.log('Bulk-Jobs –', new Date().toISOString());

for (const [script, args] of JOBS) {
  try {
    await run(script, args);
  } catch (err) {
    console.error(`FEHLER in ${script}:`, err.message);
    process.exitCode = 1;
  }
}

summarizeArtifacts();
console.log('\nAlle Bulk-Jobs abgeschlossen.');
