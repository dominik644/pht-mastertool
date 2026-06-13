/** PHT Power-Tool – zentrale Such- & Match-Konfiguration */

export const PHT_MATCH_KEYWORDS = [
  'hygiene', 'cleaning', 'cip', 'food production', 'hospital', 'sanitation',
  'disinfection', 'reinigung', 'desinfektion', 'wasch', 'pharma', 'food',
  'hygienestation', 'personenschleuse', 'sohlenreiniger', 'sanicare',
  'niederdruck', 'desinfektionsmittel', 'gmp', 'lebensmittel', 'klinik',
  'krankenhaus', 'waschanlage', 'behälterreinigung', 'facility', 'ewg',
  'handdesinfektion', 'clean room', 'reinraum', 'schleuse', 'washing',
  'crate washer', 'container wash', 'betriebshygiene', 'industrial hygiene',
  // Preisliste 2026 – Produktkategorien & Artikel-Familien
  'handreinigungsbecken', 'handreinigungsrinne', 'seifenspender', 'händetrockner',
  'abfallsammler', 'eingangskontrolle', 'portaldrehkreuz', 'drehsperre',
  'schürzenreinigung', 'sohlendesinfektion', 'bürstenreinigung', 'messersterilisation',
  'sterilisationsbecken', 'messerkorb', 'hygienic floor', 'desinfektionsmatte',
  'schuhtrocknung', 'stiefeltrockner', 'stiefelaufbewahrung', 'hebe-kippanlage',
  'frontlader', 'palettenreinigung', 'waschkabinett', 'gabelhubwagen', 'pendeltür',
  'bodenablauf', 'schäumer', 'schaumreinigung', 'schlauchaufroller', 'combi', 'dzw',
  'hdt', 'hst', 'ezd', 'ndr', 'kistenwäsche', 'crate wash', 'personenwaschanlage',
  'messerkorb', 'bürstenreinigung', 'messersterilisation', 'portaldrehkreuz', 'drehsperre',
  'frontlader', 'hebe-kipp', 'palettenwasch', 'reinigungsbedarf', 'schaumreinigung', 'schäumer',
  'abfallsammler', 'trocknungsanlage', 'messerkorbreinigung',
  // NL/EN Ergänzung für internationale Portale
  'reiniging', 'hygiëne', 'desinfectie', 'ziekenhuis', 'schoonmaak',
  // FR (BOAMP)
  'nettoyage', 'hygiène', 'désinfection', 'hôpital', 'hopital', 'pharmaceutique',
  // PL (e-Zamówienia)
  'czyszczenie', 'higiena', 'dezynfekcja', 'szpital', 'pranie', 'myjnia',
  // RO (SEAP / TED)
  'curățenie', 'curatenie', 'igienă', 'igiena', 'dezinfectare', 'spital',
  // HU (EKR / TED)
  'tisztítás', 'tisztitas', 'higiénia', 'higienia', 'fertőtlenítés', 'fertotlenites', 'kórház', 'korhaz',
  // BG (eop / TED)
  'почистване', 'хигиена', 'дезинфекция', 'болница',
  'pochistvane', 'higiena', 'dezinfektsiya', 'bolnitsa',
  // HR (EOJN / TED)
  'čišćenje', 'ciscenje', 'higijena', 'dezinfekcija', 'bolnica',
  // DK (udbud / TED)
  'rengøring', 'rengoring', 'hygiejne', 'desinfektion', 'hospital',
  // EL/GR (Diavgeia)
  'καθαρισμός', 'καθαρισμος', 'απολύμανση', 'απολυμανση', 'υγιεινή', 'υγιεινη', 'νοσοκομείο', 'νοσοκομειο',
  // PT (BASE / TED)
  'limpeza', 'higiene', 'desinfeção', 'desinfeccao', 'hospital',
  // ES/CO (SECOP / TED)
  'limpieza', 'desinfección', 'desinfeccion', 'aseo', 'sanitización', 'sanitizacion',
  // CS/CZ (NEN / TED)
  'čištění', 'cisteni', 'hygiena', 'dezinfekce', 'nemocnice', 'myčka',
  // SK (UVO / TED)
  'čistenie', 'cistenie', 'hygiena', 'dezinfekcia', 'nemocnica',
  // LT (CVP / TED)
  'valymas', 'higiena', 'dezinfekcija', 'ligonine',
  // SL/SI (ENAROCANJE / TED)
  'čiščenje', 'ciscenje', 'higiena', 'dezinfekcija', 'bolnišnica', 'bolnisnica',
  // ES/CO/CL (SECOP / Mercado Público / TED)
  'limpieza', 'desinfección', 'desinfeccion', 'aseo', 'sanitización', 'sanitizacion',
  'higiene', 'limpieza hospital', 'aseo hospitalario',
  // PT (BASE / TED) – duplicate limpeza ok
  // TR (EKAP / TED)
  'temizlik', 'hijyen', 'dezenfeksiyon', 'hastane',
  // SR (JN Portal / TED)
  'čišćenje', 'higijena', 'dezinfekcija', 'bolnica',
  // AR/MX (COMPRAR / CompraNet)
  'limpieza', 'higiene', 'desinfección',
];

/** CPV-Codes: Hygiene, Reinigung, Medizin, Lebensmittelmaschinen */
export const PHT_CPV_CODES = [
  '42996600', '44614300', '44617000', '33192120', '33790000', '90910000',
  '90911000', '90919000', '45262600', '45330000', '42924700', '39830000',
];

export const TED_SEARCH_QUERIES = [
  'FT~(hygiene OR cleaning OR hospital)',
  'FT~(sanitation OR disinfection OR food)',
  'FT~(reinigung OR desinfektion OR pharma)',
  'FT~(CIP OR washing OR hygienestation)',
  'FT~(sohlenreiniger OR personenschleuse OR sanicare)',
  'FT~(industrial hygiene OR betriebshygiene OR GMP)',
  'FT~(crate washer OR container wash OR niederdruck)',
  // Preisliste 2026 – Top-Kategorien & Produktfamilien (kurze Queries für TED API)
  'FT~(handreinigungsbecken OR handreinigungsrinne)',
  'FT~(behälterreinigung OR waschkabinett OR trocknung)',
  'FT~(hygienestation OR sohlenreiniger OR sohlendesinfektion)',
  'FT~(schuhtrocknung OR stiefeltrockner OR waschanlage)',
  'FT~(messerkorb OR palettenreinigung OR schürzenreinigung)',
  'FT~(combi OR dzw OR hdt OR hst OR ezd)',
  'FT~(kistenwäsche OR personenwaschanlage OR reinraum)',
  'FT~(seifenspender OR händetrockner OR eingangskontrolle)',
  'FT~(stiefelaufbewahrung OR schlauchaufroller OR bodenablauf)',
  'FT~(messerkorb OR bürstenreinigung OR sterilisation)',
  'FT~(portaldrehkreuz OR drehsperre OR eingangskontrolle)',
  'FT~(frontlader OR hebekipp OR palettenwasch)',
  'FT~(reinigungsbedarf OR schaumreinigung OR schäumer)',
  'FT~(abfallsammler OR niederdruck OR automatische spender)',
  'FT~(trocknungsanlage OR messerkorbreinigung OR satellit)',
  'FT~(facility OR gebäudereinigung OR unterhaltsreinigung)',
  'FT~(waschraum OR sanitär OR washroom)',
  'FT~(reinigungsbedarf OR reinigungsmittel OR cleaning supplies)',
];

/** DACH-Fokus für Marktführer-Strategie */
export const TED_DACH_QUERIES = [
  'FT~(hygiene OR reinigung) AND CY=(DEU OR AUT OR CHE)',
  'FT~(CIP OR desinfektion OR hospital) AND CY=(DEU OR AUT OR CHE)',
  'FT~(food production OR pharma OR GMP) AND CY=(DEU OR AUT OR CHE)',
  'FT~(handreinigungsbecken OR waschkabinett) AND CY=(DEU OR AUT OR CHE)',
  'FT~(behälterreinigung OR hygienestation) AND CY=(DEU OR AUT OR CHE)',
  'FT~(schuhtrocknung OR trocknungsanlage) AND CY=(DEU OR AUT OR CHE)',
  'FT~(messerkorb OR bürstenreinigung) AND CY=(DEU OR AUT OR CHE)',
  'FT~(frontlader OR portaldrehkreuz) AND CY=(DEU OR AUT OR CHE)',
];

/** TED-Länderfilter für priorisierte Märkte (ergänzt nationale Provider) */
export const TED_COUNTRY_QUERIES = [
  'FT~(hygiene OR cleaning OR hospital) AND CY=(POL OR FRA)',
  'FT~(reinigung OR desinfektion OR pharma) AND CY=(POL OR FRA OR ROU OR CZE)',
  'FT~(nettoyage OR hygiène OR hôpital) AND CY=(FRA)',
  'FT~(czyszczenie OR higiena OR szpital) AND CY=(POL)',
  'FT~(curățenie OR igienă OR spital) AND CY=(ROU)',
  'FT~(čištění OR hygiena OR nemocnice) AND CY=(CZE)',
  'FT~(CIP OR washing OR disinfection) AND CY=(NLD OR BEL OR DNK OR IRL OR ESP OR PRT)',
  'FT~(hygiene OR reinigung) AND CY=(SWE OR FIN OR NOR)',
  'FT~(hygiene OR cleaning OR hospital) AND CY=(HUN OR ROU)',
  'FT~(tisztítás OR fertőtlenítés OR kórház) AND CY=(HUN)',
  'FT~(curățenie OR igienă OR spital) AND CY=(ROU)',
  'FT~(καθαρισμός OR απολύμανση OR νοσοκομείο) AND CY=(GRC)',
  'FT~(čišćenje OR higijena OR bolnica) AND CY=(HRV OR SVN)',
  'FT~(valymas OR higiena OR ligonine) AND CY=(LTU OR LVA OR EST)',
  'FT~(почистване OR хигиена OR болница) AND CY=(BGR)',
  'FT~(limpeza OR higiene OR hospital) AND CY=(PRT)',
  'FT~(limpieza OR higiene OR hospital) AND CY=(ESP)',
  'FT~(rengøring OR hygiejne OR hospital) AND CY=(DNK)',
  'FT~(hygiene OR cleaning OR hospital) AND CY=(ITA OR BEL OR IRL OR LUX OR MLT OR CYP)',
  'FT~(hygiene OR cleaning OR hospital) AND CY=(SVK OR SVN OR HRV OR LTU OR LVA OR EST)',
];

export const TED_CPV_QUERIES = PHT_CPV_CODES.map((code) => `PC=${code}`);

export const BID_CHECKLIST_ITEMS = [
  'Ausschreibungsunterlagen vollständig gelesen',
  'Technische Machbarkeit mit Produktion geklärt',
  'PHT-Produktprofil & Alternativen gewählt',
  'Preiskalkulation inkl. Logistik & Service',
  'Referenzprojekte & Zertifikate bereit',
  'Eignungsnachweise / ISO / GMP geprüft',
  'Rechtliche & vertragliche Bedingungen geprüft',
  'Interne Freigabe Vertrieb / GF',
  'Angebot fristgerecht eingereicht',
  'Nachfassen & Feedback dokumentiert',
];
