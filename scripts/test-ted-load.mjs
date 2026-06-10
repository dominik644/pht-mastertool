import { loadTendersFromTED } from '../lib/tedApi.js';

const result = await loadTendersFromTED();
console.log('source:', result.source);
console.log('count:', result.tenders.length);
console.log('error:', result.error);
if (result.tenders[0]) {
  console.log('sample:', result.tenders[0].title, '|', result.tenders[0].country, '|', result.tenders[0].sourceUrl);
}
