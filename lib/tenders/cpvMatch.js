import { PHT_CPV_CODES } from '../phtConfig.js';

/** Normalize CPV to 8-digit base (strips check digit, e.g. 90910000-7 → 90910000). */
export function normalizeCpvCode(raw) {
  if (!raw) return '';
  const m = String(raw).match(/(\d{8})(?:-\d)?/);
  if (m) return m[1];
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(0, 8) : '';
}

function addCpvCode(codes, value, scheme) {
  const schemeStr = String(scheme || 'CPV').toUpperCase();
  if (scheme && !schemeStr.includes('CPV')) return;
  const normalized = normalizeCpvCode(value);
  if (normalized) codes.add(normalized);
}

function scanClassification(codes, classification) {
  if (!classification) return;
  addCpvCode(codes, classification.id, classification.scheme);
}

/** Collect CPV codes from OCDS tender objects (items, lots, additionalClassifications). */
export function collectOcdsCpvCodes(tender = {}) {
  const codes = new Set();
  scanClassification(codes, tender.classification);
  for (const c of tender.additionalClassifications ?? []) scanClassification(codes, c);
  for (const lot of tender.lots ?? []) {
    scanClassification(codes, lot.classification);
    for (const c of lot.additionalClassifications ?? []) scanClassification(codes, c);
  }
  for (const item of tender.items ?? []) {
    scanClassification(codes, item.classification);
    for (const c of item.additionalClassifications ?? []) scanClassification(codes, c);
  }
  return [...codes];
}

function cpvDivision(code) {
  return normalizeCpvCode(code).slice(0, 5);
}

/** True when any CPV code shares the 5-digit division prefix with a PHT hygiene/cleaning CPV. */
export function cpvMatchesPHT(cpvCodes = []) {
  const divisions = new Set(
    (cpvCodes || []).map(cpvDivision).filter((d) => d.length === 5),
  );
  if (!divisions.size) return false;
  return PHT_CPV_CODES.some((p) => {
    const pDiv = cpvDivision(p);
    return pDiv && divisions.has(pDiv);
  });
}
