/**
 * Plaud liefert Summaries oft als JSON { ai_content: "# Markdown..." }.
 * Wir zeigen nur die aufgearbeitete Notiz, nicht das Roh-JSON oder das Wortlaut-Kauderwelsch.
 */

export function unwrapPlaudText(raw, depth = 0) {
  if (raw == null) return '';
  if (depth > 5) return typeof raw === 'string' ? raw.trim() : '';

  if (Array.isArray(raw)) {
    return raw
      .map((seg) => {
        if (typeof seg === 'string') return seg.trim();
        const speaker = seg?.speaker ? `${seg.speaker}: ` : '';
        return `${speaker}${seg?.content ?? seg?.topic ?? ''}`.trim();
      })
      .filter(Boolean)
      .join('\n');
  }

  if (typeof raw === 'object') {
    const inner = raw.ai_content
      ?? raw.markdown
      ?? raw.summary
      ?? raw.note
      ?? raw.text
      ?? (typeof raw.content === 'string' || typeof raw.content === 'object' ? raw.content : '');
    if (inner) return unwrapPlaudText(inner, depth + 1);
    return '';
  }

  const s = String(raw).trim();
  if (!s) return '';
  if (
    (s.startsWith('{') && s.endsWith('}'))
    || (s.startsWith('[') && s.endsWith(']'))
  ) {
    try {
      return unwrapPlaudText(JSON.parse(s), depth + 1);
    } catch {
      return s;
    }
  }
  return s;
}

export function isWrappedPlaudJson(raw) {
  const s = String(raw || '').trim();
  return s.startsWith('{') && /"ai_content"\s*:/.test(s.slice(0, 400));
}

export function looksLikeRawTranscript(text) {
  const s = String(text || '');
  if (s.length < 120) return false;
  const hits = s.match(/^(?:Speaker\s+\d+|[A-ZÄÖÜ][\w.]+(?:\s+[A-ZÄÖÜ][\w.]+)?):/gm);
  return (hits?.length ?? 0) >= 3;
}

export function noteNeedsRefresh(note) {
  if (!note) return true;
  if (isWrappedPlaudJson(note.summary) || String(note.summary || '').trim().startsWith('{')) return true;
  if (looksLikeRawTranscript(note.transcript)) return true;
  return !String(note.summary || '').trim();
}

export function actionItemsFromProcessed(text) {
  const lines = String(text || '').split('\n');
  const items = [];
  let inActions = false;
  for (const line of lines) {
    if (/nächste schritte|action items|aufgaben|to-?dos|maßnahmen|next steps/i.test(line)) {
      inActions = true;
      continue;
    }
    if (inActions && /^#{1,3}\s/.test(line)) break;
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.+)/);
    if (m) {
      const item = m[1].trim();
      if (item.length > 2 && item.length < 180) items.push(item);
    }
  }
  return items.slice(0, 8);
}
