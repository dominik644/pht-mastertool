const MYMEMORY_MAX = 480;
const CHUNK_DELAY_MS = 120;

const GERMAN_HINT =
  /\b(und|der|die|das|für|mit|von|auf|ist|sind|werden|Ausschreibung|Vergabe|Lieferung|Beschaffung|Auftrag|Dienstleistung)\b|[äöüÄÖÜß]/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

export function looksGerman(text) {
  const normalized = normalizeText(text);
  if (!normalized) return true;
  if (GERMAN_HINT.test(normalized)) return true;
  const words = normalized.split(/\s+/);
  const germanish = words.filter((w) => /[äöüÄÖÜß]/.test(w) || /(ung|keit|schaft|ieren|lich)$/i.test(w));
  return germanish.length / words.length >= 0.25;
}

async function translateChunkMyMemory(text) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text.slice(0, MYMEMORY_MAX));
  url.searchParams.set('langpair', 'autodetect|de');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || 'MyMemory translation failed');
  }
  return data.responseData?.translatedText ?? text;
}

async function translateLongMyMemory(text) {
  if (text.length <= MYMEMORY_MAX) return translateChunkMyMemory(text);

  const parts = [];
  let rest = text;
  while (rest.length > 0) {
    let chunk = rest.slice(0, MYMEMORY_MAX);
    const lastSpace = chunk.lastIndexOf(' ');
    if (rest.length > MYMEMORY_MAX && lastSpace > MYMEMORY_MAX * 0.5) {
      chunk = chunk.slice(0, lastSpace);
    }
    parts.push(await translateChunkMyMemory(chunk));
    rest = rest.slice(chunk.length).trimStart();
    if (rest.length > 0) await sleep(CHUNK_DELAY_MS);
  }
  return parts.join(' ');
}

async function translateWithOpenAI(text, apiKey, model) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Übersetze Ausschreibungstexte ins Deutsche. Gib nur die Übersetzung zurück, ohne Erklärungen. Behalte Eigennamen, Referenznummern und URLs unverändert.',
        },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

export async function translateToGerman(text, { apiKey = '', model = 'gpt-4o-mini' } = {}) {
  const normalized = normalizeText(text);
  if (!normalized) return normalized;
  if (looksGerman(normalized)) return normalized;

  try {
    const translated = await translateLongMyMemory(normalized);
    if (translated && translated !== normalized) return translated;
  } catch {
    // fall through to OpenAI or original
  }

  if (apiKey) {
    try {
      const translated = await translateWithOpenAI(normalized, apiKey, model);
      if (translated) return translated;
    } catch {
      // fall through
    }
  }

  return normalized;
}

export async function translateBatchToGerman(texts, options = {}) {
  const input = Array.isArray(texts) ? texts : [];
  const results = [];
  for (const text of input) {
    results.push(await translateToGerman(text, options));
    if (input.length > 1) await sleep(80);
  }
  return results;
}

export async function handleTranslateRequest(body, apiKey, model) {
  const texts = Array.isArray(body?.texts)
    ? body.texts.map((t) => String(t ?? ''))
    : body?.text
      ? [String(body.text)]
      : [];

  if (texts.length === 0) {
    return { translations: [], error: 'No texts provided' };
  }
  if (texts.length > 25) {
    return { translations: [], error: 'Max 25 texts per request' };
  }

  const translations = await translateBatchToGerman(texts, { apiKey, model });
  return { translations };
}
