import { handleAnalyzeTenderRequest } from '../lib/analyzeTender/handler.js';
import { guardTenderAdmin } from '../lib/appAuthSession.js';

export default async function handler(req, res) {
  const guard = await guardTenderAdmin(req, res);
  if (!guard.ok) return;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const result = await handleAnalyzeTenderRequest(req.body, apiKey, model);
    if (result.error && result.mode === 'error') {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Analyse fehlgeschlagen',
      mode: 'error',
    });
  }
}
