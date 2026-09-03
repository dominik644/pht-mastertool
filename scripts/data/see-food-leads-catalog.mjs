/**
 * SEE (Südosteuropa) food-industry leads – HU, SI, HR, SK, CZ, RO, BG (partial).
 * Hygiene-relevant segments: juice, spices, fruit/veg, insects, ingredients, dairy, bakery.
 */
const toMatchKey = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const mkLeads = ({ company, sector, baseScore, sites, notePrefix }) =>
  sites.map((site) => {
    const { city, zip, country, scoreDelta = 0, expansionNote, label = 'Plant' } = site;
    const name = `${company} - ${label} ${city}`;
    return {
      matchKey: toMatchKey(`${company} ${city}`),
      name,
      city,
      zip,
      country,
      sector,
      potentialScore: Math.max(50, Math.min(90, baseScore + scoreDelta)),
      ...(expansionNote ? { expansionNote } : notePrefix ? { expansionNote: `${notePrefix} (${city})` } : {}),
    };
  });

const SEE_CATALOG = [
  ...mkLeads({
    company: 'Bonafarm Csoport',
    sector: 'dairy',
    baseScore: 82,
    notePrefix: 'HU dairy – hygiene-critical processing',
    sites: [
      { city: 'Budapest', zip: '1117', country: 'HU' },
      { city: 'Martfű', zip: '7140', country: 'HU' },
    ],
  }),
  ...mkLeads({
    company: 'Győri Keksz',
    sector: 'bakery',
    baseScore: 78,
    sites: [{ city: 'Győr', zip: '9027', country: 'HU' }],
  }),
  ...mkLeads({
    company: 'Pick Szeged',
    sector: 'convenience',
    baseScore: 72,
    sites: [{ city: 'Szeged', zip: '6725', country: 'HU' }],
  }),
  ...mkLeads({
    company: 'Hell Energy',
    sector: 'beverage',
    baseScore: 80,
    sites: [{ city: 'Szikszó', zip: '3800', country: 'HU' }],
  }),
  ...mkLeads({
    company: 'Maspex',
    sector: 'beverage',
    baseScore: 85,
    notePrefix: 'Juice & beverages PL/HU – CIP lines',
    sites: [
      { city: 'Wrocław', zip: '51-116', country: 'PL' },
      { city: 'Budapest', zip: '1117', country: 'HU' },
    ],
  }),
  ...mkLeads({
    company: 'Podravka',
    sector: 'ingredients',
    baseScore: 83,
    notePrefix: 'Spices & ingredients HR',
    sites: [{ city: 'Koprivnica', zip: '48000', country: 'HR' }],
  }),
  ...mkLeads({
    company: 'Kraš',
    sector: 'confectionery',
    baseScore: 76,
    sites: [{ city: 'Zagreb', zip: '10000', country: 'HR' }],
  }),
  ...mkLeads({
    company: 'Atlantic Grupa',
    sector: 'beverage',
    baseScore: 84,
    sites: [
      { city: 'Ljubljana', zip: '1000', country: 'SI' },
      { city: 'Rogaška Slatina', zip: '3250', country: 'SI' },
    ],
  }),
  ...mkLeads({
    company: 'Perutnina Ptuj',
    sector: 'convenience',
    baseScore: 70,
    sites: [{ city: 'Ptuj', zip: '2250', country: 'SI' }],
  }),
  ...mkLeads({
    company: 'Fructal',
    sector: 'beverage',
    baseScore: 81,
    notePrefix: 'Fruit juice SI',
    sites: [{ city: 'Gornji Grad', zip: '3342', country: 'SI' }],
  }),
  ...mkLeads({
    company: 'Agrokor / Fortenova',
    sector: 'fruit_veg',
    baseScore: 79,
    sites: [{ city: 'Zagreb', zip: '10000', country: 'HR' }],
  }),
  ...mkLeads({
    company: 'Ledo',
    sector: 'frozen',
    baseScore: 80,
    sites: [{ city: 'Zagreb', zip: '10000', country: 'HR' }],
  }),
  ...mkLeads({
    company: 'Barilla Adriatik',
    sector: 'pasta',
    baseScore: 82,
    sites: [{ city: 'Sarajevo', zip: '71000', country: 'BA' }],
  }),
  ...mkLeads({
    company: 'Kofola ČS',
    sector: 'beverage',
    baseScore: 78,
    sites: [
      { city: 'Ostrava', zip: '70200', country: 'CZ' },
      { city: 'Bratislava', zip: '82108', country: 'SK' },
    ],
  }),
  ...mkLeads({
    company: 'Olma',
    sector: 'dairy',
    baseScore: 77,
    sites: [{ city: 'Olomouc', zip: '77900', country: 'CZ' }],
  }),
  ...mkLeads({
    company: 'Hamé',
    sector: 'convenience',
    baseScore: 80,
    sites: [{ city: 'Babice', zip: '68703', country: 'CZ' }],
  }),
  ...mkLeads({
    company: 'Bohemia Sekt',
    sector: 'beverage',
    baseScore: 74,
    sites: [{ city: 'Starý Plzenec', zip: '33202', country: 'CZ' }],
  }),
  ...mkLeads({
    company: 'Emco',
    sector: 'bakery',
    baseScore: 76,
    sites: [{ city: 'Hradec Králové', zip: '50003', country: 'CZ' }],
  }),
  ...mkLeads({
    company: 'Vitana',
    sector: 'ingredients',
    baseScore: 79,
    notePrefix: 'Spices & seasonings CZ',
    sites: [{ city: 'Prague', zip: '14000', country: 'CZ' }],
  }),
  ...mkLeads({
    company: 'Tatravagónka',
    sector: 'convenience',
    baseScore: 75,
    sites: [{ city: 'Poprad', zip: '05801', country: 'SK' }],
  }),
  ...mkLeads({
    company: 'Rajec',
    sector: 'beverage',
    baseScore: 81,
    notePrefix: 'Mineral water & juice SK',
    sites: [{ city: 'Rajec', zip: '01501', country: 'SK' }],
  }),
  ...mkLeads({
    company: 'Palma',
    sector: 'fruit_veg',
    baseScore: 78,
    sites: [{ city: 'Bratislava', zip: '82108', country: 'SK' }],
  }),
  ...mkLeads({
    company: 'Dr. Oetker Romania',
    sector: 'bakery',
    baseScore: 80,
    sites: [{ city: 'Aiud', zip: '515200', country: 'RO' }],
  }),
  ...mkLeads({
    company: 'Carpathian Brau',
    sector: 'beverage',
    baseScore: 74,
    sites: [{ city: 'Brașov', zip: '500152', country: 'RO' }],
  }),
  ...mkLeads({
    company: 'Transavia',
    sector: 'ingredients',
    baseScore: 77,
    notePrefix: 'Spices & ingredients RO',
    sites: [{ city: 'Bucharest', zip: '020335', country: 'RO' }],
  }),
  ...mkLeads({
    company: 'Vel Pitar',
    sector: 'bakery',
    baseScore: 76,
    sites: [{ city: 'Bucharest', zip: '020335', country: 'RO' }],
  }),
  ...mkLeads({
    company: 'Sensiblu Food',
    sector: 'pharma',
    baseScore: 78,
    sites: [{ city: 'Bucharest', zip: '020335', country: 'RO' }],
  }),
  ...mkLeads({
    company: 'Devin',
    sector: 'beverage',
    baseScore: 75,
    sites: [{ city: 'Devin', zip: '4635', country: 'BG' }],
  }),
  ...mkLeads({
    company: 'Lactima',
    sector: 'dairy',
    baseScore: 76,
    sites: [{ city: 'Sofia', zip: '1000', country: 'BG' }],
  }),
  ...mkLeads({
    company: 'Biovela',
    sector: 'vegan',
    baseScore: 82,
    notePrefix: 'Plant-based BG',
    sites: [{ city: 'Plovdiv', zip: '4000', country: 'BG' }],
  }),
  ...mkLeads({
    company: 'Entoprotech',
    sector: 'insects',
    baseScore: 88,
    notePrefix: 'Insect protein SEE',
    sites: [{ city: 'Budapest', zip: '1117', country: 'HU' }],
  }),
  ...mkLeads({
    company: 'Insectum',
    sector: 'insects',
    baseScore: 86,
    sites: [{ city: 'Ljubljana', zip: '1000', country: 'SI' }],
  }),
  ...mkLeads({
    company: 'Vertical Farm Prague',
    sector: 'microfarming',
    baseScore: 84,
    notePrefix: 'Indoor/micro farming CZ',
    sites: [{ city: 'Prague', zip: '17000', country: 'CZ' }],
  }),
  ...mkLeads({
    company: 'Infarm',
    sector: 'microfarming',
    baseScore: 85,
    sites: [
      { city: 'Berlin', zip: '10115', country: 'DE' },
      { city: 'Brno', zip: '60200', country: 'CZ' },
    ],
  }),
  ...mkLeads({
    company: 'Zott',
    sector: 'dairy',
    baseScore: 83,
    sites: [
      { city: 'Mertingen', zip: '86690', country: 'DE' },
      { city: 'Budapest', zip: '1117', country: 'HU' },
    ],
  }),
  ...mkLeads({
    company: 'Rauch',
    sector: 'beverage',
    baseScore: 86,
    notePrefix: 'Juice AT/SEE',
    sites: [
      { city: 'Rankweil', zip: '6830', country: 'AT' },
      { city: 'Budapest', zip: '1117', country: 'HU' },
    ],
  }),
  ...mkLeads({
    company: 'Spitz',
    sector: 'fruit_veg',
    baseScore: 80,
    sites: [{ city: 'Attnang-Puchheim', zip: '4800', country: 'AT' }],
  }),
  ...mkLeads({
    company: 'Agrana',
    sector: 'ingredients',
    baseScore: 84,
    sites: [
      { city: 'Tulln', zip: '3430', country: 'AT' },
      { city: 'Brașov', zip: '500152', country: 'RO' },
      { city: 'Hrušovany', zip: '69123', country: 'CZ' },
    ],
  }),
  ...mkLeads({
    company: 'Grewia',
    sector: 'fruit_veg',
    baseScore: 77,
    sites: [{ city: 'Košice', zip: '04001', country: 'SK' }],
  }),
  ...mkLeads({
    company: 'Orkla Foods',
    sector: 'convenience',
    baseScore: 79,
    sites: [{ city: 'Brno', zip: '60200', country: 'CZ' }],
  }),
  ...mkLeads({
    company: 'Nestlé SK',
    sector: 'convenience',
    baseScore: 85,
    sites: [{ city: 'Prievidza', zip: '97101', country: 'SK' }],
  }),
  ...mkLeads({
    company: 'Mondelez CEE',
    sector: 'confectionery',
    baseScore: 84,
    sites: [{ city: 'Budapest', zip: '1117', country: 'HU' }],
  }),
  ...mkLeads({
    company: 'Unilever CEE',
    sector: 'sauces',
    baseScore: 83,
    sites: [{ city: 'Budapest', zip: '1117', country: 'HU' }],
  }),
  ...mkLeads({
    company: 'Kofola',
    sector: 'beverage',
    baseScore: 77,
    sites: [{ city: 'Košice', zip: '04001', country: 'SK' }],
  }),
  ...mkLeads({
    company: 'Mlekarna Kunín',
    sector: 'dairy',
    baseScore: 78,
    sites: [{ city: 'Kunín', zip: '74253', country: 'CZ' }],
  }),
  ...mkLeads({
    company: 'Mlekpol',
    sector: 'dairy',
    baseScore: 80,
    sites: [{ city: 'Grajewo', zip: '19-200', country: 'PL' }],
  }),
  ...mkLeads({
    company: 'Oshee',
    sector: 'beverage',
    baseScore: 76,
    sites: [{ city: 'Warsaw', zip: '02-672', country: 'PL' }],
  }),
  ...mkLeads({
    company: 'Hortex',
    sector: 'fruit_veg',
    baseScore: 79,
    notePrefix: 'Frozen fruit/veg PL',
    sites: [{ city: 'Skierniewice', zip: '96-100', country: 'PL' }],
  }),
  ...mkLeads({
    company: 'Lorenz Snack-World',
    sector: 'snacks',
    baseScore: 81,
    sites: [{ city: 'Prague', zip: '14000', country: 'CZ' }],
  }),
  ...mkLeads({
    company: 'Insect Farm Croatia',
    sector: 'insects',
    baseScore: 87,
    sites: [{ city: 'Zagreb', zip: '10000', country: 'HR' }],
  }),
  ...mkLeads({
    company: 'Bioferm',
    sector: 'plant_based',
    baseScore: 83,
    sites: [{ city: 'Bratislava', zip: '82108', country: 'SK' }],
  }),
  ...mkLeads({
    company: 'SunGarden',
    sector: 'fruit_veg',
    baseScore: 78,
    notePrefix: 'Salad & fresh-cut HR',
    sites: [{ city: 'Osijek', zip: '31000', country: 'HR' }],
  }),
  ...mkLeads({
    company: 'Vindija',
    sector: 'dairy',
    baseScore: 79,
    sites: [{ city: 'Varaždin', zip: '42000', country: 'HR' }],
  }),
  ...mkLeads({
    company: 'Mlekara Subotica',
    sector: 'dairy',
    baseScore: 75,
    sites: [{ city: 'Subotica', zip: '24000', country: 'RS' }],
  }),
  ...mkLeads({
    company: 'Dijamant',
    sector: 'oils_fats',
    baseScore: 77,
    sites: [{ city: 'Zrenjanin', zip: '23000', country: 'RS' }],
  }),
  ...mkLeads({
    company: 'Flora Food CEE',
    sector: 'vegan',
    baseScore: 82,
    sites: [{ city: 'Budapest', zip: '1117', country: 'HU' }],
  }),
  ...mkLeads({
    company: 'SpiceCo Balkan',
    sector: 'ingredients',
    baseScore: 80,
    notePrefix: 'Spice processing BG',
    sites: [{ city: 'Plovdiv', zip: '4000', country: 'BG' }],
  }),
  ...mkLeads({
    company: 'Freshcut Sofia',
    sector: 'fruit_veg',
    baseScore: 77,
    sites: [{ city: 'Sofia', zip: '1000', country: 'BG' }],
  }),
];

export default SEE_CATALOG;
