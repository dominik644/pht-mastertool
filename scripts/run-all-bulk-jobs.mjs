/**
 * Führt alle Bulk-Ingest-Skripte nacheinander aus.
 *   node scripts/run-all-bulk-jobs.mjs
 *   npm run bulk:ingest
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const JOBS = [
  ['bulk-ingest-opentender.mjs', ['--countries', 'HU,RO']],
  ['bulk-ingest-ireland.mjs', []],
];

function run(script, args) {
  return new Promise((resolve, reject) => {
    const file = path.join(ROOT, 'scripts', script);
    console.log(`\n▶ node scripts/${script} ${args.join(' ')}`);
    const child = spawn(process.execPath, [file, ...args], { cwd: ROOT, stdio: 'inherit' });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${script} exit ${code}`))));
  });
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

console.log('\nAlle Bulk-Jobs abgeschlossen.');
