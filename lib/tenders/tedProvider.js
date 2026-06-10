import { loadTendersFromTED } from '../tedApi.js';

export async function fetchTEDTenders() {
  return loadTendersFromTED();
}
