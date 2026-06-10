import { handleAssistantRequest } from '../lib/assistant/handler.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const result = await handleAssistantRequest(req.body, apiKey, model);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      reply: 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.',
      actions: [],
      mode: 'error',
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}
