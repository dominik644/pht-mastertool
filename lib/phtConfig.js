/** PHT Power-Tool – zentrale Such- & Match-Konfiguration */

export const PHT_MATCH_KEYWORDS = [
  'hygiene', 'cleaning', 'cip', 'food production', 'hospital', 'sanitation',
  'disinfection', 'reinigung', 'desinfektion', 'wasch', 'pharma', 'food',
  'hygienestation', 'personenschleuse', 'sohlenreiniger', 'sanicare',
  'niederdruck', 'desinfektionsmittel', 'gmp', 'lebensmittel', 'lebensmittelbetrieb', 'lebensmittelbetriebe', 'klinik',
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
  // Industriewaschanlagen / Sonderbau (PHT Kernkompetenz)
  'sonderbau', 'industriewasch', 'industriewaschanlage', 'kistenwasch', 'behälterwasch',
  'palettenwasch', 'mülltonnenwasch', 'muelltonnenwasch', 'containerwasch', 'blumentopf',
  '1000 liter', 'waschmaschine', 'industriewaschmaschine', 'palettenwascher', 'reinigungsanlage',
  'schaumstation', 'schaumstationen',
  // PHT Kernprodukte Preisliste 2026 – Spinde, Garderoben, Reinigungsgeräte
  'spind', 'spinde', 'schließfach', 'garderobe', 'garderoben', 'wertfachschrank',
  'umkleide', 'umkleideraum', 'feuerwehrspind', 'locker', 'wardrobe', 'changing room',
  'besen', 'bürste', 'bürsten', 'schaufel', 'reinigungsgerät', 'reinigungsgeräte',
  'scheuerbürste', 'handbürste', 'waschbürste', 'kehrschaufel',
  'schaumstation', 'hauptstation', 'satellitenstation', 'niederdruckanlage', 'schäumer', 'foamico',
  'schaumreinigung', 'bodendose', 'druckerhöhungsanlage',
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
  // IT (ANAC / TED)
  'pulizia', 'sanificazione', 'ospedale', 'ospedaliero', 'igienizzazione', 'disinfezione',
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
  // NZ (GETS)
  'cleaning', 'hygiene', 'disinfection', 'hospital', 'sanitation',
  // KE/GH (TED-only Afrika)
  'cleaning', 'hygiene', 'hospital', 'sanitation',
  // IL/AE (TED / portal)
  'ניקיון', 'חיטוי', 'בית חולים',
  // JP/SG/IN (TED-only Asien-Ausschluss gilt für Provider, TED-Queries optional)
  '清掃', '衛生', '消毒', '病院',
];

/**
 * CPV Equipment: Industriewasch-/Reinigungsmaschinen, Hygieneanlagen, Spinde (nicht 9091-Dienstleistung).
 * 4292* Lebensmittel-/Behälterwaschmaschinen, 3971* Waschmaschinen, 4461* Reinigungsmaschinen.
 */
export const PHT_CPV_EQUIPMENT_CODES = [
  '42924700', '42996600', '42920000',
  '39711300', '39713400',
  '44614300', '44617000',
  '33192120', '33790000', '39830000',
  '39134000', '39134100', '39130000', '44421720',
  '45330000',
];

/** CPV Dienstleistung: Gebäude-/Unterhaltsreinigung – nur mit Equipment-Signal matchen */
export const PHT_CPV_SERVICE_CODES = [
  '90910000', '90911000', '90919000', '45262600',
];

/** Alle CPV für TED-Suche (Equipment + Service – Filterung in matchesPHT) */
export const PHT_CPV_CODES = [...PHT_CPV_EQUIPMENT_CODES, ...PHT_CPV_SERVICE_CODES];

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
  'FT~(sonderbau OR waschanlage OR industrie wasch)',
  'FT~(kistenwasch OR behälterwasch OR palettenwasch)',
  'FT~(mülltonnenwasch OR containerwasch OR crate washer)',
  'FT~(waschkabinett OR palettenwascher OR reinigungsanlage)',
  'FT~(waschraum OR sanitär OR washroom)',
  'FT~(reinigungsbedarf OR reinigungsmittel OR cleaning supplies)',
  'FT~(spind OR garderobe OR schließfach OR locker OR wardrobe)',
  'FT~(umkleide OR wertfachschrank OR feuerwehrspind)',
  'FT~(besen OR bürste OR schaufel OR reinigungsgerät)',
  'FT~(schaumstation OR hauptstation OR satellitenstation OR niederdruckanlage)',
  'FT~(hygienestation OR schaumreinigung OR schäumer OR foamico)',
];

/** Lebensmittelbetriebe weltweit – Umbau/Neubau/Zubau (TED FT-Suche, kein Scraping). */
export const TED_FOOD_FACILITY_QUERIES = [
  'FT~(lebensmittelbetrieb OR lebensmittel) AND FT~(umbau OR neubau OR zubau OR sanierung OR erweiterung)',
  'FT~(food processing OR food facility OR food plant) AND FT~(construction OR renovation OR extension OR new build)',
  'FT~(dairy plant OR brewery OR slaughterhouse OR meat processing) AND FT~(renovation OR construction OR refurbishment)',
  'FT~(Lebensmittelindustrie OR Lebensmittelproduktion) AND FT~(Umbau OR Neubau OR Anlagenbau)',
  'FT~(food industry OR food manufacturing) AND FT~(building OR turnkey OR general contractor)',
  'FT~(molkerei OR schlachthof OR brauerei OR bäckerei) AND FT~(neubau OR umbau OR sanierung)',
  'FT~(food processing plant construction OR food facility renovation)',
  'FT~(produktionshalle OR produktionsanlage) AND FT~(lebensmittel OR food OR nahrungsmittel)',
];

/** Food-Facility-Queries mit Länderfokus (ergänzt globale Queries oben). */
export const TED_FOOD_FACILITY_COUNTRY_QUERIES = [
  'FT~(food processing OR food facility) AND FT~(construction OR renovation) AND CY=(DEU OR AUT OR CHE)',
  'FT~(lebensmittelbetrieb OR lebensmittel) AND FT~(umbau OR neubau) AND CY=(DEU OR AUT OR CHE)',
  'FT~(food plant OR dairy) AND FT~(renovation OR construction) AND CY=(POL OR CZE OR HUN OR ROU)',
  'FT~(food processing OR agroalimentaire) AND FT~(construction OR renovation) AND CY=(FRA OR BEL OR NLD)',
  'FT~(food industry OR food facility) AND FT~(construction OR renovation) AND CY=(ITA OR ESP OR PRT)',
  'FT~(food processing OR food plant) AND FT~(construction OR renovation) AND CY=(GBR OR IRL)',
  'FT~(food facility OR food processing) AND FT~(construction OR renovation) AND CY=(SWE OR DNK OR FIN OR NOR)',
  'FT~(food processing OR food plant) AND FT~(construction OR renovation) AND CY=(NZL OR AUS OR ZAF)',
  'FT~(food industry OR food facility) AND FT~(construction OR renovation) AND CY=(BRA OR ARG OR CHL OR COL)',
  'FT~(food processing OR food plant) AND FT~(construction OR renovation) AND CY=(CAN OR MEX)',
];

/** Score-Boost für Lebensmittelbetrieb-Umbau/Neubau (phtScoring). */
export const PHT_FOOD_FACILITY_SCORE_BOOST = 18;

/** Produktprofil-ID für Food-Facility-Vertrieb. */
export const PHT_FOOD_FACILITY_PROFILE_ID = 'lebensmittel-anlagenbau';

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
  // EEA-Kleinstaaten (CAP 22)
  'FT~(hygiene OR cleaning OR hospital) AND CY=(ISL OR LIE)',
  'FT~(hygiene OR reinigung OR hospital) AND CY=(ISL OR LIE)',
  // TED-only: Balkan, Türkei, Naher Osten, Afrika, Ozeanien, CHE
  'FT~(hygiene OR cleaning OR hospital) AND CY=(SRB OR BIH OR MNE OR MKD OR ALB OR XKX)',
  'FT~(čišćenje OR higijena OR bolnica) AND CY=(SRB)',
  'FT~(temizlik OR hijyen OR hastane) AND CY=(TUR)',
  'FT~(hygiene OR cleaning OR hospital) AND CY=(TUR OR SRB)',
  'FT~(hygiene OR cleaning OR hospital) AND CY=(ISR OR ARE OR SAU OR QAT OR BHR)',
  'FT~(hygiene OR cleaning OR hospital) AND CY=(GHA OR KEN OR NGA OR RWA)',
  'FT~(hygiene OR cleaning OR hospital) AND CY=(NZL OR AUS)',
  'FT~(hygiene OR reinigung OR hospital) AND CY=(CHE)',
  'FT~(nettoyage OR hygiène OR hôpital) AND CY=(CHE)',
  // EU-Lücken ohne Live-Nationalfeed
  'FT~(rengøring OR hygiejne OR hospital) AND CY=(DNK)',
  'FT~(hygiene OR cleaning OR hospital) AND CY=(IRL OR BEL)',
  'FT~(limpeza OR higiene OR hospital) AND CY=(PRT)',
  'FT~(limpieza OR higiene OR hospital) AND CY=(ESP)',
  'FT~(hygiene OR cleaning OR hospital) AND CY=(ITA)',
];

export const TED_CPV_QUERIES = PHT_CPV_CODES.map((code) => `PC=${code}`);

/** DE-spezifische CPV-Queries für bessere Abdeckung deutscher TED-Bekanntmachungen */
export const TED_DE_CPV_QUERIES = PHT_CPV_CODES.map((code) => `PC=${code} AND CY=DEU`);

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
