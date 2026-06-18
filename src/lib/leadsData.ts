/**
 * Lädt Lead-JSON aus public/data/leads/ – robust für Vite-Dev und Vercel-Produktion.
 * Erkennt SPA-Fallback (HTML statt JSON) und probiert BASE_URL-Pfad.
 */
export async function fetchLeadsJson<T>(filename: string): Promise<T | null> {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
  const candidates = [
    `${base}data/leads/${filename}`,
    `/data/leads/${filename}`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('text/html')) continue;
      const text = await res.text();
      if (text.trimStart().startsWith('<')) continue;
      return JSON.parse(text) as T;
    } catch {
      /* nächster Pfad */
    }
  }
  return null;
}
