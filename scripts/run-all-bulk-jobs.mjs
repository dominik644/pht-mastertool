/**
 * Führt alle Bulk-Ingest-Skripte nacheinander aus (täglich via GitHub Actions).
 *   node scripts/run-all-bulk-jobs.mjs
 *   npm run bulk:ingest
 *
 * Workflow bleibt grün, solange alle Artefakte vorhanden sind (ggf. mit refreshFailed-Fallback).
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

const REQUIRED_ARTIFACTS = [
  'opentender-hu.json',
  'opentender-ro.json',
  'opentender-pl.json',
  'etenders-ie.json',
  'eojn-hr.json',
  'anac-it.json',
  'pcsp-es.json',
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
      const stale = payload.refreshFailed ? ' [refreshFailed]' : '';
      console.log(
        `  ${file}: ${payload.matched ?? payload.tenders?.length ?? 0} Treffer, fetchedAt=${at}${stale}`,
      );
    } catch (err) {
      console.log(`  ${file}: FEHLER (${err.message})`);
    }
  }
}

function missingArtifacts() {
  return REQUIRED_ARTIFACTS.filter((file) => {
    const p = path.join(BULK_DIR, file);
    if (!fs.existsSync(p)) return true;
    try {
      const payload = JSON.parse(fs.readFileSync(p, 'utf8'));
      return !payload?.tenders?.length;
    } catch {
      return true;
    }
  });
}

/** Backup-Cron (06:00 UTC): überspringen wenn Hauptlauf alle Artefakte frisch geliefert hat. */
function shouldSkipBackupRun() {
  if (process.env.BULK_INGEST_BACKUP !== '1') return false;
  const maxAgeMs = 3 * 60 * 60 * 1000;
  const now = Date.now();
  for (const file of REQUIRED_ARTIFACTS) {
    const p = path.join(BULK_DIR, file);
    if (!fs.existsSync(p)) return false;
    try {
      const payload = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (!payload?.tenders?.length || payload.refreshFailed) return false;
      const at = payload.fetchedAt || payload.generatedAt;
      if (!at || now - new Date(at).getTime() > maxAgeMs) return false;
    } catch {
      return false;
    }
  }
  return true;
}

console.log('Bulk-Jobs –', new Date().toISOString());

if (shouldSkipBackupRun()) {
  console.log('Backup-Lauf (06:00 UTC): alle Artefakte < 3h frisch – überspringe.');
  summarizeArtifacts();
  process.exit(0);
}

const failures = [];
for (const [script, args] of JOBS) {
  try {
    await run(script, args);
  } catch (err) {
    console.error(`FEHLER in ${script}:`, err.message);
    failures.push(script);
  }
}

summarizeArtifacts();

const missing = missingArtifacts();
if (missing.length) {
  console.error(`\n❌ Fehlende/leere Artefakte: ${missing.join(', ')}`);
  process.exit(1);
}

if (failures.length) {
  console.warn(`\n⚠ ${failures.length} Skript(e) mit Fehler, Artefakte aus Fallback/Cache vorhanden: ${failures.join(', ')}`);
} else {
  console.log('\n✓ Alle Bulk-Jobs erfolgreich.');
}

console.log('\nAlle Bulk-Jobs abgeschlossen.');
