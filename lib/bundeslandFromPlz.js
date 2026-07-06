/**
 * Infer Austrian / German Bundesland from postal code and optional city hint.
 * @param {string} zip
 * @param {string} country
 * @param {string} [city]
 * @returns {string | null}
 */
export function inferBundesland(zip, country, city = '') {
  const plz = String(zip ?? '').trim();
  const cc = String(country ?? '').toUpperCase();
  const cityLower = String(city ?? '').toLowerCase();

  if (cc === 'AT' || (/^\d{4}$/.test(plz) && cc !== 'DE')) {
    return inferAustrianBundesland(plz, cityLower);
  }
  if (cc === 'DE' || /^\d{5}$/.test(plz)) {
    return inferGermanBundesland(plz);
  }
  return null;
}

/** @param {string} plz @param {string} cityLower */
function inferAustrianBundesland(plz, cityLower) {
  const n = parseInt(plz, 10);
  if (Number.isNaN(n)) return null;

  if (/wien|vienna/.test(cityLower)) return 'Wien';

  if ((n >= 1010 && n <= 1239) || (n >= 1400 && n <= 1423)) return 'Wien';
  if (n >= 2000 && n <= 3999) return 'Niederösterreich';
  if (n >= 4000 && n <= 4999) return 'Oberösterreich';
  if (n >= 5000 && n <= 5999) return 'Salzburg';
  if (n >= 6000 && n <= 6699) return 'Tirol';
  if (n >= 6700 && n <= 6999) return 'Vorarlberg';
  if (n >= 7000 && n <= 7999) return 'Burgenland';
  if (n >= 8000 && n <= 8999) return 'Steiermark';
  if (n >= 9000 && n <= 9999) return 'Kärnten';
  return null;
}

/** @param {string} plz */
function inferGermanBundesland(plz) {
  const p = parseInt(plz.slice(0, 2), 10);
  if (Number.isNaN(p)) return null;

  if (p <= 9) return 'Sachsen';
  if (p <= 14) return 'Berlin';
  if (p <= 16) return 'Brandenburg';
  if (p <= 19) return 'Mecklenburg-Vorpommern';
  if (p <= 22) return 'Hamburg';
  if (p <= 25) return 'Schleswig-Holstein';
  if (p <= 29) return 'Niedersachsen';
  if (p <= 33) return 'Nordrhein-Westfalen';
  if (p <= 36) return 'Hessen';
  if (p <= 39) return 'Sachsen-Anhalt';
  if (p <= 48) return 'Nordrhein-Westfalen';
  if (p === 49) return 'Niedersachsen';
  if (p <= 53) return 'Nordrhein-Westfalen';
  if (p <= 56) return 'Rheinland-Pfalz';
  if (p <= 59) return 'Nordrhein-Westfalen';
  if (p <= 65) return 'Hessen';
  if (p === 66) return 'Saarland';
  if (p <= 69) return 'Rheinland-Pfalz';
  if (p <= 79) return 'Baden-Württemberg';
  if (p <= 97) return 'Bayern';
  return 'Thüringen';
}

export const AT_BUNDESLAND_ORDER = [
  'Wien',
  'Niederösterreich',
  'Oberösterreich',
  'Salzburg',
  'Steiermark',
  'Tirol',
  'Vorarlberg',
  'Kärnten',
  'Burgenland',
];

export const BUNDESLAND_SHORT = {
  Wien: 'Wien',
  Niederösterreich: 'NÖ',
  Oberösterreich: 'OÖ',
  Salzburg: 'Sbg',
  Steiermark: 'STM',
  Tirol: 'Tirol',
  Vorarlberg: 'Vbg',
  Kärnten: 'Ktn',
  Burgenland: 'Bgld',
};
