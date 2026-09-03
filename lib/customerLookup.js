import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'public', 'data', 'customer-priorities.json');

/** @type {import('../public/data/customer-priorities.json') | null} */
let cache = null;

function loadData() {
  if (!cache) {
    cache = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  }
  return cache;
}

/**
 * @param {string} customerId
 */
export function findCustomerById(customerId) {
  const data = loadData();
  return data.customers.find((c) => c.id === customerId) ?? null;
}

export function getCadenceMonths(priority) {
  const map = { A: 6, B: 12, C: 18 };
  return map[priority] ?? 12;
}
