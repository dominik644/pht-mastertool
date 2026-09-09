import { existsSync, readFileSync } from 'node:fs';
import { customerPrioritiesPath } from './customerDataFiles.js';

/** @type {{ customers: Array<{ id: string, zip?: string, city?: string, name?: string }> } | null} */
let cache = null;

function loadData() {
  if (!cache) {
    const file = customerPrioritiesPath();
    if (!existsSync(file)) return { customers: [] };
    cache = JSON.parse(readFileSync(file, 'utf8'));
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
