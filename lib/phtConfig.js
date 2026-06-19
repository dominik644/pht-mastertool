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
  'FT~(food plant hygiene equipment OR lebensmittelhygiene anlage)',
  'FT~(waste bin washer OR tonnenwaschanlage)',
  'FT~(apron washer OR schürzenreinigung)',
  // Portfolio segment queries (phtPortfolio)
  'FT~(industrial washer OR sonderbau waschanlage OR kistenwaschanlage)',
  'FT~(foam station OR schaumstation OR niederdruckanlage)',
  'FT~(locker OR spind OR garderobe OR feuerwehrspind)',
  'FT~(cleaning brush OR besen OR bürste OR reinigungsbedarf)',
  'FT~(food facility construction) OR FT~(lebensmittelbetrieb neubau)',
  'FT~(hospital hygiene station OR krankenhaus hygienestation)',
  'FT~(municipal locker OR kommune garderobe)',
  'FT~(fire station locker OR feuerwehrhaus spind)',
  'FT~(logistics warehouse cleaning OR logistikhalle reinigung)',
];

/**
 * Lebensmittelbetriebe weltweit – Umbau/Neubau/Zubau (TED FT-Suche, kein Scraping).
 * TED v3: OR innerhalb FT~(…) liefert oft 0 Treffer – Begriffe als FT~(a) OR FT~(b) verknüpfen.
 */
export const TED_FOOD_FACILITY_QUERIES = [
  'FT~(molkerei) OR FT~(milchbildungszentrum) OR FT~(milchverarbeitung) OR FT~(dairy plant)',
  'FT~(milchwerk) OR FT~(käserei) OR FT~(cheese plant) OR FT~(laiterie) OR FT~(fromagerie)',
  'FT~(agroalimentaire) OR FT~(industrie alimentaire) OR FT~(usine alimentaire)',
  'FT~(food processing plant) OR FT~(food facility) OR FT~(food manufacturing facility)',
  'FT~(slaughterhouse) OR FT~(abattoir) OR FT~(meat processing plant)',
  'FT~(schlachthof) OR FT~(fleischverarbeitung) OR FT~(fleischverarbeitungsbetrieb)',
  '(FT~(abattoir) OR FT~(meat processing plant) OR FT~(meat factory)) AND (FT~(construction) OR FT~(renovation) OR FT~(extension) OR FT~(neubau) OR FT~(umbau) OR FT~(rénovation))',
  'FT~(obstverarbeitungsbetrieb) OR FT~(gemüseverarbeitungsbetrieb) OR FT~(gemueseverarbeitungsbetrieb) OR FT~(obstverarbeitung)',
  '(FT~(fruit processing plant) OR FT~(vegetable processing plant) OR FT~(packing house)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(fruit packing) OR FT~(packhouse) OR FT~(sorting plant)) AND (FT~(construction) OR FT~(renovation) OR FT~(extension))',
  'FT~(bäckerei neubau) OR FT~(bakery plant) OR FT~(bakery construction) OR FT~(boulangerie industrielle)',
  '(FT~(bäckerei) OR FT~(bakery plant) OR FT~(boulangerie)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(vegan production) OR FT~(plant-based protein) OR FT~(pflanzliche alternative)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau) OR FT~(facility) OR FT~(plant))',
  'FT~(saftverarbeitung) OR FT~(juice processing plant) OR FT~(usine de jus) OR FT~(fruit juice processing)',
  '(FT~(saftverarbeitung) OR FT~(juice processing) OR FT~(fruit juice processing)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  'FT~(lebensmittelbetrieb) OR FT~(nahrungsmittelbetrieb)',
  'FT~(brauerei neubau) OR FT~(brewery construction) OR FT~(brewery extension)',
  'FT~(cuisine centrale) OR FT~(kühlhaus) OR FT~(cold storage)',
  'PC=71300000 AND (FT~(milchbildungszentrum) OR FT~(food plant) OR FT~(lebensmittelbetrieb) OR FT~(food processing))',
  'PC=71200000 AND (FT~(food processing) OR FT~(lebensmittelbetrieb) OR FT~(dairy plant))',
  'PC=45212422 AND (FT~(cuisine centrale) OR FT~(küche) OR FT~(kitchen) OR FT~(alimentaire))',
  // Fisch & Meeresfrüchte
  '(FT~(fish processing plant) OR FT~(fischverarbeitung) OR FT~(seafood plant) OR FT~(fischräucherei)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau) OR FT~(extension))',
  '(FT~(fish processing) OR FT~(seafood processing) OR FT~(surimi)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant) OR FT~(facility))',
  // Fleisch-Spezial & Geflügel
  '(FT~(sausage factory) OR FT~(wurstwarenfabrik) OR FT~(charcuterie)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(poultry processing) OR FT~(chicken processing) OR FT~(putenverarbeitung)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant) OR FT~(facility))',
  // Milchprodukte (Butter, Joghurt, Eis)
  '(FT~(butter plant) OR FT~(joghurtfabrik) OR FT~(yogurt factory) OR FT~(ice cream plant) OR FT~(speiseeisfabrik)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(milk powder) OR FT~(milchpulver) OR FT~(whey processing)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant) OR FT~(facility))',
  // Mühlen, Stärke, Getreide
  '(FT~(flour mill) OR FT~(getreidemühle) OR FT~(malzerei) OR FT~(malting plant) OR FT~(starch factory)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  // Öle, Zucker, Trockenwaren
  '(FT~(oil mill) OR FT~(ölmühle) OR FT~(sugar refinery) OR FT~(zuckerfabrik)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant) OR FT~(facility))',
  '(FT~(rice mill) OR FT~(legume processing) OR FT~(hülsenfrüchte)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant))',
  // Teigwaren, Snacks, Süßwaren
  '(FT~(pasta factory) OR FT~(teigwarenfabrik) OR FT~(nudelfabrik)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(chocolate factory) OR FT~(schokoladenfabrik) OR FT~(confectionery plant) OR FT~(süßwarenfabrik)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(snack factory) OR FT~(chipsfabrik) OR FT~(cereal plant) OR FT~(müslifabrik)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant))',
  // Getränke: Wasser, Kaffee, Tee, Wein, Spirituosen
  '(FT~(bottled water) OR FT~(mineral water) OR FT~(soft drink plant) OR FT~(beverage plant)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(coffee roasting) OR FT~(kaffeerösterei) OR FT~(tea processing) OR FT~(teeverarbeitung)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant) OR FT~(facility))',
  '(FT~(winery) OR FT~(weinkellerei) OR FT~(distillery) OR FT~(brennerei) OR FT~(spirit distillery)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  // Tiefkühl, Konserven, Fertiggerichte
  '(FT~(frozen food plant) OR FT~(tiefkühlkostfabrik) OR FT~(canning plant) OR FT~(konservenfabrik)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(ready meal plant) OR FT~(convenience food) OR FT~(sous-vide)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant) OR FT~(facility))',
  // Pet Food, Babynahrung, Spezial
  '(FT~(pet food plant) OR FT~(tierfutterherstellung) OR FT~(baby food plant) OR FT~(babynahrung)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(flavor production) OR FT~(aromenproduktion) OR FT~(vinegar production) OR FT~(essigproduktion)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant))',
  // Kälte-Kette & Verpackung
  '(FT~(blast freezer) OR FT~(schockfroster) OR FT~(controlled atmosphere) OR FT~(tiefkühllager)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  '(FT~(co-packing) OR FT~(aseptic filling) OR FT~(high pressure processing) OR FT~(hpp)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant) OR FT~(facility))',
  // Vegan-Spezial & institutionelle Catering-Küchen
  '(FT~(tofu factory) OR FT~(tempeh) OR FT~(oat milk plant) OR FT~(plant milk)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant) OR FT~(facility))',
  '(FT~(airline catering kitchen) OR FT~(rail catering kitchen) OR FT~(flugzeug catering)) AND (FT~(construction) OR FT~(renovation) OR FT~(neubau) OR FT~(umbau))',
  // Obst/Gemüse-Spezial
  '(FT~(salad washing) OR FT~(potato processing) OR FT~(dried fruit) OR FT~(spice processing)) AND (FT~(construction) OR FT~(renovation) OR FT~(plant) OR FT~(facility))',
];

/** Food-Facility-Queries mit Länderfokus (ergänzt globale Queries oben). */
export const TED_FOOD_FACILITY_COUNTRY_QUERIES = [
  '(FT~(food processing) OR FT~(food facility)) AND (FT~(construction) OR FT~(renovation)) AND CY=(DEU OR AUT OR CHE)',
  '(FT~(lebensmittelbetrieb) OR FT~(lebensmittel)) AND (FT~(umbau) OR FT~(neubau)) AND CY=(DEU OR AUT OR CHE)',
  '(FT~(food plant) OR FT~(dairy)) AND (FT~(renovation) OR FT~(construction)) AND CY=(POL OR CZE OR HUN OR ROU)',
  '(FT~(food processing) OR FT~(agroalimentaire)) AND (FT~(construction) OR FT~(renovation)) AND CY=(FRA OR BEL OR NLD)',
  '(FT~(food industry) OR FT~(food facility)) AND (FT~(construction) OR FT~(renovation)) AND CY=(ITA OR ESP OR PRT)',
  '(FT~(food processing) OR FT~(food plant)) AND (FT~(construction) OR FT~(renovation)) AND CY=(GBR OR IRL)',
  '(FT~(food facility) OR FT~(food processing)) AND (FT~(construction) OR FT~(renovation)) AND CY=(SWE OR DNK OR FIN OR NOR)',
  '(FT~(food processing) OR FT~(food plant)) AND (FT~(construction) OR FT~(renovation)) AND CY=(NZL OR AUS OR ZAF)',
  '(FT~(food industry) OR FT~(food facility)) AND (FT~(construction) OR FT~(renovation)) AND CY=(BRA OR ARG OR CHL OR COL)',
  '(FT~(food processing) OR FT~(food plant)) AND (FT~(construction) OR FT~(renovation)) AND CY=(CAN OR MEX)',
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
