import { PHT_CPV_CODES } from '../phtConfig.js';

/** True when any CPV code shares the 5-digit division prefix with a PHT hygiene/cleaning CPV. */
export function cpvMatchesPHT(cpvCodes = []) {
  return (cpvCodes || []).some((c) =>
    PHT_CPV_CODES.some((p) => String(c).startsWith(p.slice(0, 5))),
  );
}
