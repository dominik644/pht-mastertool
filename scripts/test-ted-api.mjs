const res = await fetch('https://api.ted.europa.eu/v3/notices/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'FT~(hygiene OR cleaning OR hospital OR sanitation)',
    fields: [
      'notice-title',
      'publication-number',
      'place-of-performance-country-proc',
      'organisation-country-buyer',
      'deadline-receipt-tender-date-lot',
      'description-glo',
      'estimated-value-lot',
      'classification-cpv',
      'publication-date',
      'links',
    ],
    limit: 2,
    scope: 'ACTIVE',
    page: 1,
    paginationMode: 'PAGE_NUMBER',
  }),
});
const data = await res.json();
console.log('total', data.totalNoticeCount);
console.log(JSON.stringify(data.notices?.[0], null, 2).slice(0, 3500));
