const toMatchKey = (value) =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const mkLeads = ({ company, sector, baseScore, sites, notePrefix }) =>
  sites.map((site) => {
    const {
      city,
      zip,
      country = 'DE',
      scoreDelta = 0,
      expansionNote,
      label = 'Plant',
    } = site;
    const name = `${company} - ${label} ${city}`;
    return {
      matchKey: toMatchKey(`${company} ${city}`),
      name,
      city,
      zip,
      country,
      sector,
      potentialScore: Math.max(50, Math.min(90, baseScore + scoreDelta)),
      ...(expansionNote
        ? { expansionNote }
        : notePrefix
          ? { expansionNote: `${notePrefix} (${city})` }
          : {}),
    };
  });

// Packaging for food plants (Multivac, Ulma, tray/film/MAP, bottling)
const PACKAGING = [
  ...mkLeads({
    company: 'MULTIVAC Group',
    sector: 'packaging',
    baseScore: 88,
    notePrefix: 'Food packaging machinery and hygiene-critical lines',
    sites: [
      { city: 'Wolfertschwenden', zip: '87787', country: 'DE' },
      { city: 'Lechbruck', zip: '86983', country: 'DE' },
      { city: 'Balgach', zip: '9436', country: 'CH' },
      { city: 'Vienna', zip: '1230', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'ULMA Packaging',
    sector: 'packaging',
    baseScore: 86,
    sites: [
      { city: 'Memmingen', zip: '87700', country: 'DE' },
      { city: 'Sursee', zip: '6210', country: 'CH' },
      { city: 'Wiener Neudorf', zip: '2351', country: 'AT' },
      { city: 'Utrecht', zip: '3542', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'SEALPAC',
    sector: 'packaging',
    baseScore: 84,
    sites: [
      { city: 'Oldenburg', zip: '26135', country: 'DE' },
      { city: 'Luzern', zip: '6003', country: 'CH' },
      { city: 'Salzburg', zip: '5020', country: 'AT' },
      { city: 'Tilburg', zip: '5038', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Suedpack',
    sector: 'packaging',
    baseScore: 83,
    sites: [
      { city: 'Ochsenhausen', zip: '88416', country: 'DE' },
      { city: 'Erolzheim', zip: '88453', country: 'DE' },
      { city: 'Baar', zip: '6340', country: 'CH' },
      { city: 'Kufstein', zip: '6330', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Syntegon Food Packaging',
    sector: 'packaging',
    baseScore: 81,
    sites: [
      { city: 'Waiblingen', zip: '71332', country: 'DE' },
      { city: 'Remshalden', zip: '73630', country: 'DE' },
      { city: 'Beringen', zip: '8222', country: 'CH' },
      { city: 'Bologna', zip: '40121', country: 'IT' },
    ],
  }),
  ...mkLeads({
    company: 'Optima packaging group',
    sector: 'packaging',
    baseScore: 82,
    sites: [
      { city: 'Schwaebisch Hall', zip: '74523', country: 'DE' },
      { city: 'Radolfzell', zip: '78315', country: 'DE' },
      { city: 'Pfaffikon', zip: '8808', country: 'CH' },
      { city: 'Linz', zip: '4020', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Krones Food Solutions',
    sector: 'packaging',
    baseScore: 80,
    sites: [
      { city: 'Neutraubling', zip: '93073', country: 'DE' },
      { city: 'Rosenheim', zip: '83022', country: 'DE' },
      { city: 'Basel', zip: '4051', country: 'CH' },
      { city: 'Budweis', zip: '37001', country: 'CZ' },
    ],
  }),
  ...mkLeads({
    company: 'KHS Food and Beverage',
    sector: 'packaging',
    baseScore: 79,
    sites: [
      { city: 'Dortmund', zip: '44139', country: 'DE' },
      { city: 'Kleve', zip: '47533', country: 'DE' },
      { city: 'Wien', zip: '1100', country: 'AT' },
      { city: 'Zurich', zip: '8005', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'ALPLA Food Packaging',
    sector: 'packaging',
    baseScore: 84,
    sites: [
      { city: 'Hard', zip: '6971', country: 'AT' },
      { city: 'Fuessen', zip: '87629', country: 'DE' },
      { city: 'Nendeln', zip: '9485', country: 'CH' },
      { city: 'Zwolle', zip: '8011', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Greiner Packaging',
    sector: 'packaging',
    baseScore: 82,
    sites: [
      { city: 'Kremsmuenster', zip: '4550', country: 'AT' },
      { city: 'Diepoldsau', zip: '9444', country: 'CH' },
      { city: 'Krems', zip: '3500', country: 'AT' },
      { city: 'Freiberg', zip: '09599', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Constantia Flexibles',
    sector: 'packaging',
    baseScore: 85,
    sites: [
      { city: 'Wien', zip: '1030', country: 'AT' },
      { city: 'Pirk', zip: '5674', country: 'AT' },
      { city: 'Pirk bei Weiden', zip: '92712', country: 'DE' },
      { city: 'Winterthur', zip: '8400', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Schur Flexibles',
    sector: 'packaging',
    baseScore: 83,
    sites: [
      { city: 'Wiener Neudorf', zip: '2351', country: 'AT' },
      { city: 'Baden', zip: '2500', country: 'AT' },
      { city: 'Bremen', zip: '28195', country: 'DE' },
      { city: 'Leiden', zip: '2311', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Mondi Consumer Packaging',
    sector: 'packaging',
    baseScore: 81,
    sites: [
      { city: 'Hallein', zip: '5400', country: 'AT' },
      { city: 'Aschersleben', zip: '06449', country: 'DE' },
      { city: 'Stans', zip: '6370', country: 'CH' },
      { city: 'Kladno', zip: '27201', country: 'CZ' },
    ],
  }),
  ...mkLeads({
    company: 'RKW Food Films',
    sector: 'packaging',
    baseScore: 75,
    sites: [
      { city: 'Mannheim', zip: '68199', country: 'DE' },
      { city: 'Worms', zip: '67547', country: 'DE' },
      { city: 'Luzern', zip: '6004', country: 'CH' },
      { city: 'Steyr', zip: '4400', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Huhtamaki Foodservice',
    sector: 'packaging',
    baseScore: 78,
    sites: [
      { city: 'Alf', zip: '56859', country: 'DE' },
      { city: 'Ronsberg', zip: '87671', country: 'DE' },
      { city: 'Vienna', zip: '1120', country: 'AT' },
      { city: 'Zurich', zip: '8001', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'SIG Combibloc',
    sector: 'packaging',
    baseScore: 82,
    sites: [
      { city: 'Neuhausen', zip: '8212', country: 'CH' },
      { city: 'Linnich', zip: '52441', country: 'DE' },
      { city: 'Linz', zip: '4020', country: 'AT' },
      { city: 'Warsaw', zip: '00-001', country: 'PL' },
    ],
  }),
  ...mkLeads({
    company: 'Elopak Filling and Cartons',
    sector: 'packaging',
    baseScore: 77,
    sites: [
      { city: 'Mannheim', zip: '68165', country: 'DE' },
      { city: 'Ter Apel', zip: '9561', country: 'NL' },
      { city: 'Zurich', zip: '8050', country: 'CH' },
      { city: 'Krakow', zip: '30-001', country: 'PL' },
    ],
  }),
  ...mkLeads({
    company: 'FAERCH Food Trays',
    sector: 'packaging',
    baseScore: 76,
    sites: [
      { city: 'Elsenfeld', zip: '63820', country: 'DE' },
      { city: 'Hesel', zip: '26835', country: 'DE' },
      { city: 'Amstelveen', zip: '1181', country: 'NL' },
      { city: 'Biel', zip: '2502', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'PACCOR Food Packaging',
    sector: 'packaging',
    baseScore: 77,
    sites: [
      { city: 'Dusseldorf', zip: '40211', country: 'DE' },
      { city: 'Ravensburg', zip: '88212', country: 'DE' },
      { city: 'Prague', zip: '11000', country: 'CZ' },
      { city: 'Lodz', zip: '90-001', country: 'PL' },
    ],
  }),
  ...mkLeads({
    company: 'Sabert Europe',
    sector: 'packaging',
    baseScore: 69,
    sites: [
      { city: 'Niederzissen', zip: '56651', country: 'DE' },
      { city: 'Venlo', zip: '5911', country: 'NL' },
      { city: 'Zurich', zip: '8048', country: 'CH' },
      { city: 'Brno', zip: '60200', country: 'CZ' },
    ],
  }),
];

// Insect farms and insect protein
const INSECTS = [
  ...mkLeads({
    company: 'Protix',
    sector: 'insects',
    baseScore: 89,
    sites: [
      { city: 'Bergen op Zoom', zip: '4612', country: 'NL' },
      { city: 'Eindhoven', zip: '5611', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Ynsect',
    sector: 'insects',
    baseScore: 88,
    sites: [
      { city: 'Amiens', zip: '80080', country: 'FR' },
      { city: 'Paris', zip: '75002', country: 'FR' },
    ],
  }),
  ...mkLeads({
    company: 'Innovafeed',
    sector: 'insects',
    baseScore: 87,
    sites: [
      { city: 'Nesle', zip: '80190', country: 'FR' },
      { city: 'Paris', zip: '75008', country: 'FR' },
    ],
  }),
  ...mkLeads({
    company: 'Essento',
    sector: 'insects',
    baseScore: 84,
    sites: [
      { city: 'Zurich', zip: '8005', country: 'CH' },
      { city: 'Basel', zip: '4051', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Agronutris',
    sector: 'insects',
    baseScore: 80,
    sites: [
      { city: 'Rethel', zip: '08300', country: 'FR' },
      { city: 'Reims', zip: '51100', country: 'FR' },
    ],
  }),
  ...mkLeads({
    company: 'nextProtein',
    sector: 'insects',
    baseScore: 78,
    sites: [
      { city: 'Paris', zip: '75009', country: 'FR' },
      { city: 'Leiden', zip: '2312', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Nasekomo',
    sector: 'insects',
    baseScore: 74,
    sites: [
      { city: 'Rotterdam', zip: '3011', country: 'NL' },
      { city: 'Berlin', zip: '10115', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Bugfoundation',
    sector: 'insects',
    baseScore: 73,
    sites: [
      { city: 'Osnabruck', zip: '49074', country: 'DE' },
      { city: 'Munich', zip: '80331', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Hermetia',
    sector: 'insects',
    baseScore: 76,
    sites: [
      { city: 'Baruth', zip: '15837', country: 'DE' },
      { city: 'Leipzig', zip: '04109', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Entobel Europe',
    sector: 'insects',
    baseScore: 75,
    sites: [
      { city: 'Wageningen', zip: '6708', country: 'NL' },
      { city: 'Ede', zip: '6711', country: 'NL' },
    ],
  }),
];

// Convenience and frozen food producers
const CONVENIENCE_FROZEN = [
  ...mkLeads({
    company: 'Weinbergmaier',
    sector: 'frozen',
    baseScore: 78,
    sites: [
      { city: 'Wolfern', zip: '4493', country: 'AT' },
      { city: 'Wels', zip: '4600', country: 'AT' },
      { city: 'Steyr', zip: '4400', country: 'AT' },
      { city: 'Linz', zip: '4020', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Resch und Frisch',
    sector: 'frozen',
    baseScore: 76,
    sites: [
      { city: 'Wels', zip: '4600', country: 'AT' },
      { city: 'Vienna', zip: '1230', country: 'AT' },
      { city: 'Salzburg', zip: '5020', country: 'AT' },
      { city: 'Innsbruck', zip: '6020', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Bofrost',
    sector: 'frozen',
    baseScore: 77,
    sites: [
      { city: 'Straelen', zip: '47638', country: 'DE' },
      { city: 'Muelheim', zip: '45468', country: 'DE' },
      { city: 'Krakow', zip: '31-001', country: 'PL' },
      { city: 'Prague', zip: '11000', country: 'CZ' },
    ],
  }),
  ...mkLeads({
    company: 'Bonduelle Prepared Foods DACH',
    sector: 'convenience',
    baseScore: 74,
    sites: [
      { city: 'Reutlingen', zip: '72760', country: 'DE' },
      { city: 'Straelen', zip: '47638', country: 'DE' },
      { city: 'Utrecht', zip: '3511', country: 'NL' },
      { city: 'Warsaw', zip: '00-001', country: 'PL' },
    ],
  }),
  ...mkLeads({
    company: 'Grossmann Feinkost',
    sector: 'convenience',
    baseScore: 72,
    sites: [
      { city: 'Reinbek', zip: '21465', country: 'DE' },
      { city: 'Hamburg', zip: '20539', country: 'DE' },
      { city: 'Luebeck', zip: '23558', country: 'DE' },
      { city: 'Bremen', zip: '28195', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Heinrich Kuhlmann',
    sector: 'convenience',
    baseScore: 71,
    sites: [
      { city: 'Rietberg', zip: '33397', country: 'DE' },
      { city: 'Bielefeld', zip: '33602', country: 'DE' },
      { city: 'Muenster', zip: '48143', country: 'DE' },
      { city: 'Hannover', zip: '30159', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Sander Gourmet',
    sector: 'convenience',
    baseScore: 73,
    sites: [
      { city: 'Wiebelsheim', zip: '56291', country: 'DE' },
      { city: 'Koblenz', zip: '56068', country: 'DE' },
      { city: 'Mainz', zip: '55116', country: 'DE' },
      { city: 'Mannheim', zip: '68159', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Dreistern Konserven',
    sector: 'convenience',
    baseScore: 72,
    sites: [
      { city: 'Neuenbuerg', zip: '79395', country: 'DE' },
      { city: 'Freiburg', zip: '79098', country: 'DE' },
      { city: 'Karlsruhe', zip: '76133', country: 'DE' },
      { city: 'Stuttgart', zip: '70173', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Vandemoortele',
    sector: 'frozen',
    baseScore: 78,
    sites: [
      { city: 'Herford', zip: '32052', country: 'DE' },
      { city: 'Koeln', zip: '50667', country: 'DE' },
      { city: 'Linz', zip: '4020', country: 'AT' },
      { city: 'Utrecht', zip: '3521', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Lantmaennen Unibake DACH',
    sector: 'frozen',
    baseScore: 77,
    sites: [
      { city: 'Luebeck', zip: '23558', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
      { city: 'Vienna', zip: '1220', country: 'AT' },
      { city: 'Zurich', zip: '8050', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Aryzta Frozen Bakery DACH',
    sector: 'frozen',
    baseScore: 76,
    sites: [
      { city: 'Eisleben', zip: '06295', country: 'DE' },
      { city: 'Freiberg', zip: '09599', country: 'DE' },
      { city: 'Vienna', zip: '1100', country: 'AT' },
      { city: 'Baar', zip: '6340', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Hilcona',
    sector: 'convenience',
    baseScore: 79,
    sites: [
      { city: 'Schaan', zip: '9494', country: 'CH' },
      { city: 'Orbe', zip: '1350', country: 'CH' },
      { city: 'Vienna', zip: '1030', country: 'AT' },
      { city: 'Feldkirch', zip: '6800', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'frigemo',
    sector: 'frozen',
    baseScore: 77,
    sites: [
      { city: 'Cressier', zip: '1785', country: 'CH' },
      { city: 'Zuzwil', zip: '9524', country: 'CH' },
      { city: 'Muri', zip: '5630', country: 'CH' },
      { city: 'Aarberg', zip: '3270', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Greenyard Prepared',
    sector: 'frozen',
    baseScore: 74,
    sites: [
      { city: 'Eindhoven', zip: '5652', country: 'NL' },
      { city: 'Venlo', zip: '5911', country: 'NL' },
      { city: 'Breda', zip: '4811', country: 'NL' },
      { city: 'Leuven', zip: '3000', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Bieze Food Group',
    sector: 'convenience',
    baseScore: 69,
    sites: [
      { city: 'Nijkerk', zip: '3861', country: 'NL' },
      { city: 'Utrecht', zip: '3512', country: 'NL' },
      { city: 'Arnhem', zip: '6811', country: 'NL' },
      { city: 'Zwolle', zip: '8011', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Qizini',
    sector: 'convenience',
    baseScore: 68,
    sites: [
      { city: 'Alphen aan den Rijn', zip: '2408', country: 'NL' },
      { city: 'Leiden', zip: '2311', country: 'NL' },
      { city: 'Den Haag', zip: '2511', country: 'NL' },
      { city: 'Rotterdam', zip: '3011', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Mautner Markhof Feinkost',
    sector: 'sauces',
    baseScore: 75,
    sites: [
      { city: 'Wien', zip: '1110', country: 'AT' },
      { city: 'Laa an der Thaya', zip: '2136', country: 'AT' },
      { city: 'Graz', zip: '8020', country: 'AT' },
      { city: 'Linz', zip: '4020', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Develey Food',
    sector: 'sauces',
    baseScore: 73,
    sites: [
      { city: 'Unterhaching', zip: '82008', country: 'DE' },
      { city: 'Dingolfing', zip: '84130', country: 'DE' },
      { city: 'Mainz', zip: '55116', country: 'DE' },
      { city: 'Prague', zip: '11000', country: 'CZ' },
    ],
  }),
  ...mkLeads({
    company: 'Hengstenberg Feinkost',
    sector: 'sauces',
    baseScore: 71,
    sites: [
      { city: 'Esslingen', zip: '73728', country: 'DE' },
      { city: 'Bad Friedrichshall', zip: '74177', country: 'DE' },
      { city: 'Metzingen', zip: '72555', country: 'DE' },
      { city: 'Vienna', zip: '1120', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Popp Feinkost',
    sector: 'convenience',
    baseScore: 71,
    sites: [
      { city: 'Kaltenkirchen', zip: '24568', country: 'DE' },
      { city: 'Lueneburg', zip: '21335', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
      { city: 'Kiel', zip: '24103', country: 'DE' },
    ],
  }),
];

// Vegan, bio and plant-based
const VEGAN_BIO = [
  ...mkLeads({
    company: 'Taifun-Tofu',
    sector: 'vegan',
    baseScore: 84,
    sites: [
      { city: 'Freiburg', zip: '79108', country: 'DE' },
      { city: 'Teningen', zip: '79331', country: 'DE' },
      { city: 'Offenburg', zip: '77652', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Berief Food',
    sector: 'plant_based',
    baseScore: 82,
    sites: [
      { city: 'Beckum', zip: '59269', country: 'DE' },
      { city: 'Lippstadt', zip: '59555', country: 'DE' },
      { city: 'Muenster', zip: '48143', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Planted Foods',
    sector: 'plant_based',
    baseScore: 86,
    sites: [
      { city: 'Kemptthal', zip: '8310', country: 'CH' },
      { city: 'Zurich', zip: '8005', country: 'CH' },
      { city: 'Munich', zip: '80331', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'New Roots',
    sector: 'vegan',
    baseScore: 82,
    sites: [
      { city: 'Oberdiessbach', zip: '3672', country: 'CH' },
      { city: 'Bern', zip: '3007', country: 'CH' },
      { city: 'Basel', zip: '4051', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Soy Austria',
    sector: 'plant_based',
    baseScore: 79,
    sites: [
      { city: 'Wulzeshofen', zip: '2064', country: 'AT' },
      { city: 'Korneuburg', zip: '2100', country: 'AT' },
      { city: 'Vienna', zip: '1210', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Sonnentor',
    sector: 'bio',
    baseScore: 80,
    sites: [
      { city: 'Sproegnitz', zip: '3910', country: 'AT' },
      { city: 'Spratzern', zip: '3100', country: 'AT' },
      { city: 'Vienna', zip: '1020', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Rapunzel Naturkost',
    sector: 'bio',
    baseScore: 81,
    sites: [
      { city: 'Legau', zip: '87764', country: 'DE' },
      { city: 'Kempten', zip: '87435', country: 'DE' },
      { city: 'Memmingen', zip: '87700', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Davert',
    sector: 'bio',
    baseScore: 76,
    sites: [
      { city: 'Borgholzhausen', zip: '33829', country: 'DE' },
      { city: 'Osnabrueck', zip: '49074', country: 'DE' },
      { city: 'Bielefeld', zip: '33602', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Bauck',
    sector: 'bio',
    baseScore: 74,
    sites: [
      { city: 'Rosche', zip: '29571', country: 'DE' },
      { city: 'Uelzen', zip: '29525', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Zwergenwiese',
    sector: 'bio',
    baseScore: 73,
    sites: [
      { city: 'Silberstedt', zip: '24887', country: 'DE' },
      { city: 'Flensburg', zip: '24937', country: 'DE' },
      { city: 'Kiel', zip: '24103', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Greenforce',
    sector: 'plant_based',
    baseScore: 79,
    sites: [
      { city: 'Munich', zip: '80331', country: 'DE' },
      { city: 'Augsburg', zip: '86150', country: 'DE' },
      { city: 'Nuremberg', zip: '90402', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Formo',
    sector: 'plant_based',
    baseScore: 83,
    sites: [
      { city: 'Berlin', zip: '13355', country: 'DE' },
      { city: 'Potsdam', zip: '14467', country: 'DE' },
      { city: 'Leipzig', zip: '04109', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Veganz',
    sector: 'vegan',
    baseScore: 77,
    sites: [
      { city: 'Berlin', zip: '10963', country: 'DE' },
      { city: 'Ludwigsfelde', zip: '14974', country: 'DE' },
      { city: 'Dresden', zip: '01067', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Luya Foods',
    sector: 'plant_based',
    baseScore: 78,
    sites: [
      { city: 'Bern', zip: '3011', country: 'CH' },
      { city: 'Zurich', zip: '8004', country: 'CH' },
      { city: 'Basel', zip: '4051', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Heilemann Bio Foods',
    sector: 'bio',
    baseScore: 68,
    sites: [
      { city: 'Wels', zip: '4600', country: 'AT' },
      { city: 'Linz', zip: '4020', country: 'AT' },
      { city: 'Salzburg', zip: '5020', country: 'AT' },
    ],
  }),
];

// Confectionery and snacks
const CONFECTIONERY_SNACKS = [
  ...mkLeads({
    company: 'Lambertz Group',
    sector: 'confectionery',
    baseScore: 75,
    sites: [
      { city: 'Aachen', zip: '52076', country: 'DE' },
      { city: 'Nuremberg', zip: '90402', country: 'DE' },
      { city: 'Berlin', zip: '10115', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Stollwerck',
    sector: 'confectionery',
    baseScore: 73,
    sites: [
      { city: 'Cologne', zip: '51149', country: 'DE' },
      { city: 'Berlin', zip: '12277', country: 'DE' },
      { city: 'Leipzig', zip: '04109', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Halloren',
    sector: 'confectionery',
    baseScore: 72,
    sites: [
      { city: 'Halle', zip: '06112', country: 'DE' },
      { city: 'Leipzig', zip: '04109', country: 'DE' },
      { city: 'Dresden', zip: '01067', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Ludwig Weinrich',
    sector: 'confectionery',
    baseScore: 72,
    sites: [
      { city: 'Herford', zip: '32049', country: 'DE' },
      { city: 'Bielefeld', zip: '33602', country: 'DE' },
      { city: 'Hannover', zip: '30159', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Maestrani',
    sector: 'confectionery',
    baseScore: 74,
    sites: [
      { city: 'Flawil', zip: '9230', country: 'CH' },
      { city: 'St Gallen', zip: '9000', country: 'CH' },
      { city: 'Winterthur', zip: '8400', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Laderach',
    sector: 'confectionery',
    baseScore: 75,
    sites: [
      { city: 'Ennenda', zip: '8755', country: 'CH' },
      { city: 'Bilten', zip: '8865', country: 'CH' },
      { city: 'Zurich', zip: '8001', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Camille Bloch',
    sector: 'confectionery',
    baseScore: 73,
    sites: [
      { city: 'Courtelary', zip: '2608', country: 'CH' },
      { city: 'Biel', zip: '2502', country: 'CH' },
      { city: 'Bern', zip: '3007', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Loacker',
    sector: 'confectionery',
    baseScore: 71,
    sites: [
      { city: 'Heinfels', zip: '9920', country: 'AT' },
      { city: 'Innsbruck', zip: '6020', country: 'AT' },
      { city: 'Vienna', zip: '1010', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Seeberger',
    sector: 'snacks',
    baseScore: 72,
    sites: [
      { city: 'Ulm', zip: '89079', country: 'DE' },
      { city: 'Neu-Ulm', zip: '89231', country: 'DE' },
      { city: 'Augsburg', zip: '86150', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Intersnack Production',
    sector: 'snacks',
    baseScore: 77,
    sites: [
      { city: 'Cologne', zip: '50667', country: 'DE' },
      { city: 'Uelzen', zip: '29525', country: 'DE' },
      { city: 'Frankfurt', zip: '60311', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Lorenz Snack-World',
    sector: 'snacks',
    baseScore: 75,
    sites: [
      { city: 'Neu-Isenburg', zip: '63263', country: 'DE' },
      { city: 'Hankensbuettel', zip: '29386', country: 'DE' },
      { city: 'Berlin', zip: '10115', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'XOX Gebaeck',
    sector: 'snacks',
    baseScore: 71,
    sites: [
      { city: 'Hameln', zip: '31785', country: 'DE' },
      { city: 'Lauenau', zip: '31867', country: 'DE' },
      { city: 'Hannover', zip: '30159', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Mogli Snacks',
    sector: 'snacks',
    baseScore: 67,
    sites: [
      { city: 'Berlin', zip: '10997', country: 'DE' },
      { city: 'Potsdam', zip: '14467', country: 'DE' },
      { city: 'Leipzig', zip: '04109', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Kluth Snack Ingredients',
    sector: 'snacks',
    baseScore: 68,
    sites: [
      { city: 'Henstedt-Ulzburg', zip: '24558', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
      { city: 'Bremen', zip: '28195', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Viba sweets',
    sector: 'confectionery',
    baseScore: 66,
    sites: [
      { city: 'Floh-Seligenthal', zip: '98593', country: 'DE' },
      { city: 'Schmalkalden', zip: '98574', country: 'DE' },
      { city: 'Erfurt', zip: '99084', country: 'DE' },
    ],
  }),
];

// Pet food
const PETFOOD = [
  ...mkLeads({
    company: 'saturn petcare',
    sector: 'petfood',
    baseScore: 84,
    sites: [
      { city: 'Bremen', zip: '28197', country: 'DE' },
      { city: 'Bremen', zip: '28195', country: 'DE', label: 'Factory' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'animonda petcare',
    sector: 'petfood',
    baseScore: 82,
    sites: [
      { city: 'Bad Rothenfelde', zip: '49214', country: 'DE' },
      { city: 'Osnabrueck', zip: '49074', country: 'DE' },
      { city: 'Muenster', zip: '48143', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Mera Tiernahrung',
    sector: 'petfood',
    baseScore: 80,
    sites: [
      { city: 'Kevelaer', zip: '47623', country: 'DE' },
      { city: 'Krefeld', zip: '47798', country: 'DE' },
      { city: 'Duesseldorf', zip: '40213', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'bosch Tiernahrung',
    sector: 'petfood',
    baseScore: 79,
    sites: [
      { city: 'Blaufelden', zip: '74572', country: 'DE' },
      { city: 'Schwaebisch Hall', zip: '74523', country: 'DE' },
      { city: 'Stuttgart', zip: '70173', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Josera petfood',
    sector: 'petfood',
    baseScore: 83,
    sites: [
      { city: 'Kleinheubach', zip: '63924', country: 'DE' },
      { city: 'Aschaffenburg', zip: '63739', country: 'DE' },
      { city: 'Wuerzburg', zip: '97070', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Bewital petfood',
    sector: 'petfood',
    baseScore: 78,
    sites: [
      { city: 'Suedlohn', zip: '46354', country: 'DE' },
      { city: 'Bocholt', zip: '46395', country: 'DE' },
      { city: 'Muenster', zip: '48143', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Deuerer Tiernahrung',
    sector: 'petfood',
    baseScore: 81,
    sites: [
      { city: 'Bretten', zip: '75015', country: 'DE' },
      { city: 'Pforzheim', zip: '75172', country: 'DE' },
      { city: 'Karlsruhe', zip: '76133', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Landguth Heimtiernahrung',
    sector: 'petfood',
    baseScore: 76,
    sites: [
      { city: 'Ihlow', zip: '26632', country: 'DE' },
      { city: 'Aurich', zip: '26603', country: 'DE' },
      { city: 'Emden', zip: '26721', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Royal Canin DACH',
    sector: 'petfood',
    baseScore: 74,
    sites: [
      { city: 'Koeln', zip: '50858', country: 'DE' },
      { city: 'Vienna', zip: '1220', country: 'AT' },
      { city: 'Zurich', zip: '8048', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'United Petfood',
    sector: 'petfood',
    baseScore: 75,
    sites: [
      { city: 'Coevorden', zip: '7741', country: 'NL' },
      { city: 'Hoogeveen', zip: '7901', country: 'NL' },
      { city: 'Zwolle', zip: '8011', country: 'NL' },
    ],
  }),
];

// Seafood
const SEAFOOD = [
  ...mkLeads({
    company: 'Deutsche See',
    sector: 'seafood',
    baseScore: 82,
    sites: [
      { city: 'Bremerhaven', zip: '27572', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
      { city: 'Berlin', zip: '10115', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Frozen Fish International',
    sector: 'seafood',
    baseScore: 79,
    sites: [
      { city: 'Bremerhaven', zip: '27572', country: 'DE' },
      { city: 'Cuxhaven', zip: '27472', country: 'DE' },
      { city: 'Bremen', zip: '28195', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Ruegen Fisch',
    sector: 'seafood',
    baseScore: 76,
    sites: [
      { city: 'Sassnitz', zip: '18546', country: 'DE' },
      { city: 'Stralsund', zip: '18435', country: 'DE' },
      { city: 'Rostock', zip: '18055', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Friesenkrone',
    sector: 'seafood',
    baseScore: 74,
    sites: [
      { city: 'Marne', zip: '25709', country: 'DE' },
      { city: 'Heide', zip: '25746', country: 'DE' },
      { city: 'Kiel', zip: '24103', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Mowi Germany',
    sector: 'seafood',
    baseScore: 71,
    sites: [
      { city: 'Cuxhaven', zip: '27474', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
      { city: 'Bremen', zip: '28195', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Royal Greenland DACH',
    sector: 'seafood',
    baseScore: 68,
    sites: [
      { city: 'Wilhelmshaven', zip: '26382', country: 'DE' },
      { city: 'Bremen', zip: '28195', country: 'DE' },
      { city: 'Hamburg', zip: '20539', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Swiss Alpine Fish',
    sector: 'seafood',
    baseScore: 69,
    sites: [
      { city: 'Lostallo', zip: '6558', country: 'CH' },
      { city: 'Bellinzona', zip: '6500', country: 'CH' },
      { city: 'Lugano', zip: '6900', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Dyhrberg',
    sector: 'seafood',
    baseScore: 66,
    sites: [
      { city: 'Balsthal', zip: '4710', country: 'CH' },
      { city: 'Solothurn', zip: '4500', country: 'CH' },
      { city: 'Basel', zip: '4051', country: 'CH' },
    ],
  }),
];

// Coffee and tea
const COFFEE_TEA = [
  ...mkLeads({
    company: 'J J Darboven',
    sector: 'coffee_tea',
    baseScore: 84,
    sites: [
      { city: 'Hamburg', zip: '21107', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE', label: 'Roastery' },
      { city: 'Berlin', zip: '10115', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Dallmayr',
    sector: 'coffee_tea',
    baseScore: 82,
    sites: [
      { city: 'Munich', zip: '80331', country: 'DE' },
      { city: 'Augsburg', zip: '86150', country: 'DE' },
      { city: 'Nuremberg', zip: '90402', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Teekanne',
    sector: 'coffee_tea',
    baseScore: 78,
    sites: [
      { city: 'Duesseldorf', zip: '40547', country: 'DE' },
      { city: 'Dresden', zip: '01139', country: 'DE' },
      { city: 'Vienna', zip: '1230', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Meßmer Tee',
    sector: 'coffee_tea',
    baseScore: 74,
    sites: [
      { city: 'Hamburg', zip: '20539', country: 'DE' },
      { city: 'Bremen', zip: '28195', country: 'DE' },
      { city: 'Luebeck', zip: '23552', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Ronnefeldt',
    sector: 'coffee_tea',
    baseScore: 75,
    sites: [
      { city: 'Frankfurt', zip: '60313', country: 'DE' },
      { city: 'Wiesbaden', zip: '65183', country: 'DE' },
      { city: 'Mainz', zip: '55116', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Delica Coffee',
    sector: 'coffee_tea',
    baseScore: 79,
    sites: [
      { city: 'Birsfelden', zip: '4127', country: 'CH' },
      { city: 'Meilen', zip: '8706', country: 'CH' },
      { city: 'Zurich', zip: '8045', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Julius Meinl Coffee',
    sector: 'coffee_tea',
    baseScore: 77,
    sites: [
      { city: 'Vienna', zip: '1160', country: 'AT' },
      { city: 'Wiener Neudorf', zip: '2351', country: 'AT' },
      { city: 'Salzburg', zip: '5020', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Minges Kaffeeroesterei',
    sector: 'coffee_tea',
    baseScore: 72,
    sites: [
      { city: 'Breitenguessbach', zip: '96149', country: 'DE' },
      { city: 'Bamberg', zip: '96047', country: 'DE' },
      { city: 'Wuerzburg', zip: '97070', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'La Semeuse',
    sector: 'coffee_tea',
    baseScore: 70,
    sites: [
      { city: 'La Chaux-de-Fonds', zip: '2300', country: 'CH' },
      { city: 'Neuchatel', zip: '2000', country: 'CH' },
      { city: 'Lausanne', zip: '1003', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Voelkel Tee und Saft',
    sector: 'coffee_tea',
    baseScore: 69,
    sites: [
      { city: 'Hohbeck', zip: '29478', country: 'DE' },
      { city: 'Lueneburg', zip: '21335', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
    ],
  }),
];

// Fruit and vegetable processors
const FRUIT_VEG = [
  ...mkLeads({
    company: 'EFKO',
    sector: 'fruit_veg',
    baseScore: 77,
    sites: [
      { city: 'Eferding', zip: '4070', country: 'AT' },
      { city: 'Haid', zip: '4053', country: 'AT' },
      { city: 'Linz', zip: '4020', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Bonduelle Fresh Europe',
    sector: 'fruit_veg',
    baseScore: 75,
    sites: [
      { city: 'Reutlingen', zip: '72760', country: 'DE' },
      { city: 'Mannheim', zip: '68159', country: 'DE' },
      { city: 'Venlo', zip: '5911', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Greenyard Fresh Germany',
    sector: 'fruit_veg',
    baseScore: 73,
    sites: [
      { city: 'Bremen', zip: '28195', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
      { city: 'Cologne', zip: '50667', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Frutura',
    sector: 'fruit_veg',
    baseScore: 74,
    sites: [
      { city: 'Hartl', zip: '8224', country: 'AT' },
      { city: 'Vienna', zip: '1030', country: 'AT' },
      { city: 'Graz', zip: '8010', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Steirerkraft',
    sector: 'fruit_veg',
    baseScore: 71,
    sites: [
      { city: 'Wollsdorf', zip: '8181', country: 'AT' },
      { city: 'Gleisdorf', zip: '8200', country: 'AT' },
      { city: 'Graz', zip: '8010', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Marchland',
    sector: 'fruit_veg',
    baseScore: 69,
    sites: [
      { city: 'Marchtrenk', zip: '4614', country: 'AT' },
      { city: 'Wels', zip: '4600', country: 'AT' },
      { city: 'Linz', zip: '4020', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Hengstenberg Vegetable Processing',
    sector: 'fruit_veg',
    baseScore: 70,
    sites: [
      { city: 'Fritzlar', zip: '34560', country: 'DE' },
      { city: 'Esslingen', zip: '73728', country: 'DE' },
      { city: 'Stuttgart', zip: '70173', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Felix Austria',
    sector: 'fruit_veg',
    baseScore: 72,
    sites: [
      { city: 'Mattersburg', zip: '7210', country: 'AT' },
      { city: 'Wiener Neustadt', zip: '2700', country: 'AT' },
      { city: 'Vienna', zip: '1100', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Bina Fresh',
    sector: 'fruit_veg',
    baseScore: 68,
    sites: [
      { city: 'Bischofszell', zip: '9220', country: 'CH' },
      { city: 'St Gallen', zip: '9000', country: 'CH' },
      { city: 'Zurich', zip: '8048', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'Natures Pride Europe',
    sector: 'fruit_veg',
    baseScore: 67,
    sites: [
      { city: 'Maasdijk', zip: '2676', country: 'NL' },
      { city: 'Rotterdam', zip: '3011', country: 'NL' },
      { city: 'Amsterdam', zip: '1017', country: 'NL' },
    ],
  }),
];

// Pasta, sauces and oils/fats
const PASTA_SAUCES_OILS = [
  ...mkLeads({
    company: 'Hilcona Pasta',
    sector: 'pasta',
    baseScore: 76,
    sites: [
      { city: 'Schaan', zip: '9494', country: 'CH' },
      { city: 'Orbe', zip: '1350', country: 'CH' },
      { city: 'Vienna', zip: '1030', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Riesa Teigwaren',
    sector: 'pasta',
    baseScore: 73,
    sites: [
      { city: 'Riesa', zip: '01587', country: 'DE' },
      { city: 'Dresden', zip: '01067', country: 'DE' },
      { city: 'Leipzig', zip: '04109', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Birkel Teigwaren',
    sector: 'pasta',
    baseScore: 71,
    sites: [
      { city: 'Mannheim', zip: '68165', country: 'DE' },
      { city: 'Augsburg', zip: '86150', country: 'DE' },
      { city: 'Ulm', zip: '89073', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Pastificio Rana DACH',
    sector: 'pasta',
    baseScore: 74,
    sites: [
      { city: 'Bologna', zip: '40121', country: 'IT' },
      { city: 'Munich', zip: '80331', country: 'DE' },
      { city: 'Zurich', zip: '8001', country: 'CH' },
    ],
  }),
  ...mkLeads({
    company: 'De Cecco DACH',
    sector: 'pasta',
    baseScore: 70,
    sites: [
      { city: 'Fara San Martino', zip: '66015', country: 'IT' },
      { city: 'Milan', zip: '20121', country: 'IT' },
      { city: 'Vienna', zip: '1020', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Mautner Markhof Sauces',
    sector: 'sauces',
    baseScore: 74,
    sites: [
      { city: 'Vienna', zip: '1110', country: 'AT' },
      { city: 'Linz', zip: '4020', country: 'AT' },
      { city: 'Graz', zip: '8010', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Kuehne Food Solutions',
    sector: 'sauces',
    baseScore: 73,
    sites: [
      { city: 'Hamburg', zip: '20457', country: 'DE' },
      { city: 'Berlin', zip: '10115', country: 'DE' },
      { city: 'Vienna', zip: '1230', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Hela Gewuerzwerk',
    sector: 'sauces',
    baseScore: 72,
    sites: [
      { city: 'Ahrensburg', zip: '22926', country: 'DE' },
      { city: 'Hamburg', zip: '20457', country: 'DE' },
      { city: 'Luebeck', zip: '23552', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Steirisches Kuerbiskernoel',
    sector: 'oils_fats',
    baseScore: 72,
    sites: [
      { city: 'Graz', zip: '8010', country: 'AT' },
      { city: 'Feldbach', zip: '8330', country: 'AT' },
      { city: 'Gleisdorf', zip: '8200', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'VFI Oils for Food',
    sector: 'oils_fats',
    baseScore: 76,
    sites: [
      { city: 'Enns', zip: '4470', country: 'AT' },
      { city: 'Wels', zip: '4600', country: 'AT' },
      { city: 'Vienna', zip: '1110', country: 'AT' },
    ],
  }),
  ...mkLeads({
    company: 'Cargill Oils Europe',
    sector: 'oils_fats',
    baseScore: 74,
    sites: [
      { city: 'Hamburg', zip: '20457', country: 'DE' },
      { city: 'Mainz', zip: '55116', country: 'DE' },
      { city: 'Schiedam', zip: '3111', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Bunge Oils Europe',
    sector: 'oils_fats',
    baseScore: 73,
    sites: [
      { city: 'Mannheim', zip: '68165', country: 'DE' },
      { city: 'Mainz', zip: '55116', country: 'DE' },
      { city: 'Amsterdam', zip: '1017', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Walter Rau Neusser Oel und Fett',
    sector: 'oils_fats',
    baseScore: 71,
    sites: [
      { city: 'Neuss', zip: '41460', country: 'DE' },
      { city: 'Duesseldorf', zip: '40213', country: 'DE' },
      { city: 'Cologne', zip: '50667', country: 'DE' },
    ],
  }),
  ...mkLeads({
    company: 'Aako B V Food Ingredients',
    sector: 'oils_fats',
    baseScore: 69,
    sites: [
      { city: 'Zaandijk', zip: '1544', country: 'NL' },
      { city: 'Amsterdam', zip: '1017', country: 'NL' },
      { city: 'Rotterdam', zip: '3011', country: 'NL' },
    ],
  }),
  ...mkLeads({
    company: 'Nutriswiss',
    sector: 'oils_fats',
    baseScore: 68,
    sites: [
      { city: 'Lyss', zip: '3250', country: 'CH' },
      { city: 'Bern', zip: '3007', country: 'CH' },
      { city: 'Zurich', zip: '8048', country: 'CH' },
    ],
  }),
];

const CATALOG = [
  // packaging for food
  ...PACKAGING,
  // insect farms / insect protein
  ...INSECTS,
  // convenience + TK/frozen
  ...CONVENIENCE_FROZEN,
  // vegan / bio / plant-based
  ...VEGAN_BIO,
  // confectionery + snacks
  ...CONFECTIONERY_SNACKS,
  // pet food
  ...PETFOOD,
  // seafood
  ...SEAFOOD,
  // coffee and tea
  ...COFFEE_TEA,
  // fruit and vegetable processing
  ...FRUIT_VEG,
  // pasta, sauces and oils/fats
  ...PASTA_SAUCES_OILS,
];

if (CATALOG.length < 350) {
  throw new Error(`Catalog too small: ${CATALOG.length} leads (minimum 350 required).`);
}

export default CATALOG;
