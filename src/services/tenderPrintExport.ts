import type { Tender } from '../types/tender';
import type { TenderAnalysisResult } from '../services/tenderAnalysis';
import { formatPriceListAmount } from '../data/priceList2026';

export function openTenderPrintView(tender: Tender, analysis?: TenderAnalysisResult | null): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
  if (!win) return;

  const matchRows = (analysis?.matches ?? []).map((m) => `
    <tr>
      <td>${m.articleNumber}</td>
      <td>${escapeHtml(m.name)}</td>
      <td>${m.matchPct}%</td>
      <td style="text-align:right">${formatPriceListAmount(m.price)}</td>
    </tr>
  `).join('');

  const reqList = (analysis?.requirements ?? []).map((r) => `<li>${escapeHtml(r)}</li>`).join('');

  win.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>PHT – ${escapeHtml(tender.title.slice(0, 80))}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #111; line-height: 1.5; }
    h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
    .meta { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; }
    th { background: #f3f4f6; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(tender.title)}</h1>
  <p class="meta">${escapeHtml(tender.country)} · Frist ${escapeHtml(tender.deadline)} · Score ${tender.score}/100 (${tender.scoreRecommendation})</p>
  <p>${escapeHtml(tender.description)}</p>
  ${analysis?.summaryDe ? `<h2>KI-Zusammenfassung</h2><p>${escapeHtml(analysis.summaryDe)}</p>` : ''}
  ${reqList ? `<h2>Anforderungen</h2><ul>${reqList}</ul>` : ''}
  ${matchRows ? `<h2>Preislisten-Match (${analysis?.overallMatchPct ?? 0}%)</h2>
  <table><thead><tr><th>Art.</th><th>Produkt</th><th>Match</th><th>Preis</th></tr></thead><tbody>${matchRows}</tbody></table>` : ''}
  <p><small>Erstellt mit PHT Mastertool · ${new Date().toLocaleString('de-DE')}</small></p>
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
