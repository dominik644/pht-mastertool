import type { Tender } from '../types/tender';

export function exportTendersCsv(tenders: Tender[], filename = 'pht-ausschreibungen.csv') {
  const headers = [
    'Titel', 'Land', 'Region', 'Score', 'Empfehlung', 'Kategorie', 'Budget EUR',
    'Deadline', 'Quelle', 'URL', 'Status', 'Watchlist',
  ];
  const rows = tenders.map((t) => [
    t.title, t.country, t.region, t.score, t.scoreRecommendation, t.category,
    t.estimatedValue, t.deadline, t.sourcePlatform, t.sourceUrl, t.status, t.watchlist ? 'ja' : 'nein',
  ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
