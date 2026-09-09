import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function customerPrioritiesPath() {
  const seeded = join(ROOT, 'customer-seeds', 'customer-priorities.json');
  if (existsSync(seeded)) return seeded;
  return join(ROOT, 'public', 'data', 'customer-priorities.json');
}
