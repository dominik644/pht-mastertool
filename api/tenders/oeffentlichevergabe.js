/** Vercel – oeffentlichevergabe.de OCDS daily export (öffentlich, kein Key) */
import { fetchOeffentlichevergabeTenders } from '../../lib/tenders/oeffentlichevergabeFetch.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const days = Math.min(Number(req.query?.days) || 2, 3);
    const tenders = await fetchOeffentlichevergabeTenders({ days });
    return res.status(200).json({ tenders, count: tenders.length });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
