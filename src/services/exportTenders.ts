import type { Tender } from '../types/tender';

export function exportTendersCsv(tenders: Tender[], filename = 'pht-ausschreibungen.csv') {
  const headers = [
    'Titel', 'Land', 'Region', 'Score', 'Empfehlung', 'Kategorie', 'Budget EUR',
    'Deadline', 'Quelle', 'URL', 'Keywords', 'CPV', 'Status', 'Watchlist', 'Katalog-Score', 'Produktlinie',
  ];
  const rows = tenders.map((t) => {
    const bd = t.scoreBreakdown as { catalogScore?: number; topProfile?: string; matchedCatalogLines?: { name: string }[] } | undefined;
    const line = bd?.matchedCatalogLines?.[0]?.name ?? bd?.topProfile ?? '';
    return [
      t.title, t.country, t.region, t.score, t.scoreRecommendation, t.category,
      t.estimatedValue, t.deadline, t.sourcePlatform, t.sourceUrl,
      (t.keywords || []).join('; '), (t.cpvCodes || []).join('; '),
      t.status, t.watchlist ? 'ja' : 'nein', bd?.catalogScore ?? '', line,
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Top GO tenders from the last 7 days – weekly sales report. */
export function exportWeeklyGoReportCsv(tenders: Tender[]) {
  const date = new Date().toISOString().slice(0, 10);
  exportTendersCsv(tenders, `pht-woechentlicher-go-report-${date}.csv`);
}

