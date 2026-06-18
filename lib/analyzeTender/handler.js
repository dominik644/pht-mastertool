/**
 * Tender-KI-Analyse: Anforderungen extrahieren + Preislisten-Matching.
 * Fallback ohne OPENAI_API_KEY: reines Keyword-Matching.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesPriceListKeywords, extractPriceListKeywords } from '../priceListKeywords.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRICE_LIST_PATH = join(__dirname, '../../src/data/priceList2026.json');

let _priceList = null;
function getPriceList() {
  if (!_priceList) {
    _priceList = JSON.parse(readFileSync(PRICE_LIST_PATH, 'utf8'));
  }
  return _priceList;
}

function tokenize(text) {
  return [...new Set(
    text.toLowerCase().split(/[^a-zäöüß0-9]+/).filter((t) => t.length >= 3),
  )];
}

function matchProducts(text, limit = 8) {
  const list = getPriceList();
  const tokens = tokenize(text);
  const scored = list.products.map((p) => {
    const blob = `${p.name} ${p.category} ${p.group} ${(p.keywords || []).join(' ')}`.toLowerCase();
    const matched = tokens.filter((t) => blob.includes(t));
    for (const kw of p.keywords || []) {
      if (text.toLowerCase().includes(kw) && !matched.includes(kw)) matched.push(kw);
    }
    const score = matched.length;
    const matchPct = Math.min(100, Math.round((score / Math.max(3, tokens.length)) * 100));
    return { product: p, score, matchedKeywords: matched, matchPct };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.product.price - a.product.price)
    .slice(0, limit);

  const overallMatchPct = scored.length
    ? Math.round(scored.reduce((s, x) => s + x.matchPct, 0) / scored.length)
    : 0;

  return { matches: scored, overallMatchPct };
}

async function extractWithOpenAI({ title, description, pdfUrl }, apiKey, model) {
  const prompt = `Analysiere diese öffentliche Ausschreibung für PHT Hygiene (Industriehygiene, Spinde, Reinigungsbedarf, Food/Pharma).

Titel: ${title}
Beschreibung: ${description || '—'}
${pdfUrl ? `PDF/Dokument-URL: ${pdfUrl}` : ''}

Antworte als JSON:
{
  "requirements": ["Anforderung 1", "..."],
  "summaryDe": "Kurze deutsche Zusammenfassung (2-3 Sätze)",
  "hygieneRelevance": "hoch|mittel|niedrig"
}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Du bist ein Ausschreibungsanalyst für Industriehygiene. Antworte nur mit gültigem JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

/**
 * @param {object} body
 * @param {string} apiKey
 * @param {string} model
 */
export async function handleAnalyzeTenderRequest(body, apiKey, model = 'gpt-4o-mini') {
  const title = String(body?.title || '').trim();
  const description = String(body?.description || '').trim();
  const pdfUrl = body?.pdfUrl ? String(body.pdfUrl) : undefined;
  const tenderId = body?.tenderId ? String(body.tenderId) : undefined;

  if (!title && !description) {
    return { error: 'title oder description erforderlich', mode: 'error' };
  }

  const text = `${title} ${description}`;
  const { matches, overallMatchPct } = matchProducts(text);

  const result = {
    tenderId,
    mode: 'keyword',
    requirements: [],
    summaryDe: null,
    hygieneRelevance: matches.length ? 'mittel' : 'niedrig',
    matches: matches.map((m) => ({
      articleNumber: m.product.articleNumber,
      name: m.product.name,
      category: m.product.category,
      price: m.product.price,
      matchPct: m.matchPct,
      matchedKeywords: m.matchedKeywords.slice(0, 6),
    })),
    overallMatchPct,
    recommendedArticles: matches.slice(0, 5).map((m) => m.product.articleNumber),
    analyzedAt: new Date().toISOString(),
    pdfUrl: pdfUrl || null,
    hasOpenAI: false,
  };

  const priceListHits = extractPriceListKeywords(text.toLowerCase());
  if (priceListHits.length && !matches.length) {
    result.requirements = priceListHits.slice(0, 8).map((k) => `Keyword: ${k}`);
  }

  if (apiKey) {
    try {
      const ai = await extractWithOpenAI({ title, description, pdfUrl }, apiKey, model);
      result.mode = 'openai';
      result.hasOpenAI = true;
      result.requirements = Array.isArray(ai.requirements) ? ai.requirements : [];
      result.summaryDe = ai.summaryDe || null;
      result.hygieneRelevance = ai.hygieneRelevance || result.hygieneRelevance;

      const aiText = `${text} ${result.requirements.join(' ')}`;
      const aiMatch = matchProducts(aiText);
      if (aiMatch.matches.length > result.matches.length) {
        result.matches = aiMatch.matches.map((m) => ({
          articleNumber: m.product.articleNumber,
          name: m.product.name,
          category: m.product.category,
          price: m.product.price,
          matchPct: m.matchPct,
          matchedKeywords: m.matchedKeywords.slice(0, 6),
        }));
        result.overallMatchPct = aiMatch.overallMatchPct;
        result.recommendedArticles = aiMatch.matches.slice(0, 5).map((m) => m.product.articleNumber);
      }
    } catch (err) {
      result.aiError = err instanceof Error ? err.message : 'KI-Analyse fehlgeschlagen';
      result.mode = 'keyword-fallback';
    }
  } else if (pdfUrl) {
    result.note = 'OPENAI_API_KEY nicht gesetzt – PDF-Analyse nur als Keyword-Match verfügbar';
  }

  if (!matchesPriceListKeywords(text.toLowerCase()) && result.matches.length === 0) {
    result.hygieneRelevance = 'niedrig';
  }

  return result;
}
