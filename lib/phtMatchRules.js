/**
 * Zentrale Match-/Ausschlussregeln für PHT-Tenderfilterung und Scoring.
 * PHT verkauft Reinigungs-AUSRÜSTUNG (Geräte, Stationen, Utensilien) – keine Reinigungsdienstleistungen.
 */

/**
 * Personen-/Gütertransport-Dienstleistungen – kein PHT-Geschäft (ohne Ausrüstungssignal).
 */
/** IT, Beratung, Software – kein PHT-Geschäft ohne Ausrüstungssignal. */
export const PHT_IT_CONSULTING_KEYWORDS = [
  'it services', 'it service', 'it consulting', 'it-beratung', 'it beratung',
  'software development', 'softwareentwicklung', 'software license', 'softwarelizenz',
  'cloud services', 'managed services', 'digital transformation', 'digitale transformation',
  'system integration', 'systemintegration', 'erp implementation', 'sap implementation',
  'cybersecurity', 'cyber security', 'network infrastructure', 'netzwerkinfrastruktur',
  'datenverarbeitung', 'edv-dienstleistung', 'edv dienstleistung', 'edv-leistung',
  'information technology', 'informationstechnologie', 'it-infrastruktur', 'it infrastruktur',
  'helpdesk', 'application support', 'software support', 'cloud migration',
];

/**
 * Lebensmittelbetriebe / Anlagenbau – legitime PHT-Chance (Hygieneanlagen bei Umbau/Neubau).
 * Kistenwaschanlagen, Schaumstationen, Hygienestationen, Spinde für Personal.
 */
export const PHT_FOOD_FACILITY_KEYWORDS = [
  'lebensmittelbetrieb', 'lebensmittelbetriebe', 'lebensmittel betrieb', 'lebensmittel betriebe',
  'food processing', 'food facility', 'food plant', 'food processing plant', 'food processing facility',
  'food industry', 'food manufacturing', 'food production facility', 'food factory',
  'nahrungsmittelbetrieb', 'ernährungsbetrieb', 'ernaehrungsbetrieb', 'lebensmittelindustrie',
  'lebensmittelproduktion', 'lebensmittelverarbeitung',
  'molkerei', 'milchbildungszentrum', 'milchverarbeitung', 'milchwerk', 'milchindustrie',
  'dairy plant', 'dairy facility', 'dairy factory', 'cheese plant', 'käserei', 'kaeserei', 'laiterie',
  'schlachthof', 'slaughterhouse', 'abattoir', 'meat plant', 'poultry plant',
  'fleischverarbeitung', 'meat processing plant', 'meat processing facility',
  'backbetrieb', 'bäckerei', 'baeckerei', 'brewery', 'brauerei', 'beverage plant',
  'getränkebetrieb', 'getraenkebetrieb', 'confectionery plant',
  'agroalimentaire', 'industrie alimentaire', 'usine alimentaire', 'transformation alimentaire',
  'voedselverwerking', 'voedselindustrie',
  'kühlhaus', 'kuehlhaus', 'cold storage facility', 'cold store',
  'produktionsstätte', 'produktionsstaette', 'produktionsbetrieb',
  'cuisine centrale', 'küchenbau', 'kuechenbau',
];

/** Reine Lebensmittel-Lieferung/Verpflegung – kein Anlagenbau-Umbau. */
const PHT_FOOD_SUPPLY_ONLY_PHRASES = [
  'belieferung', 'lieferung von lebensmitteln', 'lieferung von nahrungsmitteln',
  'versorgung mit lebensmitteln', 'rahmenvereinbarung lebensmittel',
  'food supply', 'supply of food', 'procurement of food', 'food products supply',
  'diverse nahrungsmittel', 'nahrungsmittel, getränke',
];

/** Umbau/Zubau/Neubau – nur mit Lebensmittel-Kontext als Food-Facility-Signal. */
const PHT_FOOD_FACILITY_BUILD_VERBS = [
  'umbau', 'zubau', 'neubau', 'erweiterung', 'ausbau', 'sanierung', 'modernisierung',
  'renovation', 'renovierung', 'refurbishment', 'refurbish', 'construction', 'bauarbeiten',
  'bauleistungen', 'anlagenbau', 'new build', 'extension', 'expansion',
];

const PHT_FOOD_CONTEXT_TERMS = [
  'lebensmittel', 'food', 'nahrungsmittel', 'molkerei', 'milch', 'milchwerk', 'schlachthof',
  'bäckerei', 'baeckerei', 'metzgerei', 'fleisch', 'dairy', 'meat processing', 'brewery', 'brauerei',
  'beverage', 'lebensmittelbetrieb', 'food plant', 'food facility', 'food processing',
  'agroalimentaire', 'alimentaire', 'voedsel', 'laiterie', 'käserei', 'kaeserei',
];

/**
 * Generisches Bauen/Sanieren ohne Food-/Hygienebezug – kein PHT-Geschäft.
 * (z. B. Rathaus-Sanierung, Straßenbau – nicht Lebensmittelbetrieb-Umbau)
 */
export const PHT_GENERIC_CONSTRUCTION_KEYWORDS = [
  'bauarbeiten', 'bauleistungen', 'baumaßnahmen', 'baumassnahmen', 'baumaßnahme',
  'hochbau', 'tiefbau', 'rohbau', 'generalunternehmer', 'generalübernehmer', 'generaluebernehmer',
  'erdarbeiten', 'mauerarbeiten', 'abbrucharbeiten', 'abbruch',
  'building works', 'civil works', 'construction work', 'construction of',
  'architect led design', 'design and build', 'deckensanierung', 'dachsanierung', 'fassadensanierung',
  'road construction', 'straßenbau', 'strassenbau', 'brückenbau', 'brueckenbau',
];

/** Catering / Verpflegung – kein PHT-Geschäft. */
export const PHT_CATERING_KEYWORDS = [
  'catering', 'catering services', 'catering service', 'mahlzeitendienst', 'essenbelieferung',
  'kantinenbetrieb', 'verpflegungsdienst', 'verpflegungsleistung', 'food service',
  'meal service', 'school meals', 'patient meals', 'hospital catering', 'mensa',
  'speisversorgung', 'betriebsgastronomie', 'restaurant service', 'canteen service',
];

/**
 * Personen-/Gütertransport-Dienstleistungen – kein PHT-Geschäft (ohne Ausrüstungssignal).
 */
export const PHT_TRANSPORT_SERVICE_KEYWORDS = [
  'passenger transport', 'personenbeförderung', 'personenbefoerderung', 'personenverkehr',
  'personennahverkehr', 'öffentlicher personennahverkehr', 'oeffentlicher personennahverkehr',
  'öpnv', 'oepnv', 'public transport', 'local transport', 'transit service', 'paratransit',
  'transport services', 'transport service', 'transportdienst', 'transportdienstleistung',
  'beförderungsleistung', 'befoerderungsleistung', 'beförderungsleistungen', 'befoerderungsleistungen',
  'linienverkehr', 'linienbündel', 'linienbuendel', 'busverkehr', 'bus service', 'bus operator',
  'coach operator', 'coach services', 'minibus operator', 'taxi operator', 'taxi service', 'taxi services',
  'schülerverkehr', 'schuelerverkehr', 'school bus', 'rahmenvereinbarung transport',
  'patient transport service', 'krankentransport', 'patiententransport', 'ambulance transport',
  'ferry passenger', 'rail passenger', 'verkehrsdienst', 'verkehrsleistung', 'verkehrsleistungen',
];

/** Kurze Preislisten-Fragmente – nur mit Ausrüstungs-/Hygiene-Gate zählen. */
export const PHT_WEAK_PRICE_LIST_FRAGMENTS = [
  'bei', 'min', 'auf', 'aus', 'eco', 'eld', 'san', 'sch', 'vic', 'tic', 'original',
];

/** False positives – medizinische Verbrauchsmaterialien, Babyprodukte etc. */
export const PHT_EXCLUSION_KEYWORDS = [
  'windeln', 'windel', 'diaper', 'diapers', 'nappy', 'nappies',
  'inkontinenz', 'incontinence', 'incontinencia', 'incontinência',
  'inkontinenzprodukt', 'inkontinenzversorgung', 'inkontinenzartikel',
  'höschenwindel', 'hoeschenwindel', 'windelpants', 'windelhosen', 'pull-up',
  'babywindeln', 'einwegwindeln', 'erwachsenenwindeln', 'adult diaper',
  'pampers', 'huggies', 'pflegehilfsmittel', 'hilfsmittelversorgung',
  'katheter', 'stomaversorgung', 'stomapflege', 'trachealkanüle', 'trachealkanuele',
  'verbandmaterial', 'kompressionsstrümpfe', 'kompressionsstruempfe',
  'saugling', 'neugeborenen', 'babyartikel', 'babypflege',
  'mundpflegeprodukte', 'zahnbürsten einweg', 'einweghandschuhe',
  'desinfektionstücher patient', 'patientenwindel',
];

/**
 * Reinigungs-DIENSTLEISTUNGEN – ohne Ausrüstungsbezug ausschließen bzw. stark abwerten.
 * Gebäudereinigung, Unterhaltsreinigung, FM-Reinigung etc.
 */
export const PHT_SERVICE_ONLY_KEYWORDS = [
  'unterhaltsreinigung', 'gebäudereinigung', 'gebaeudereinigung', 'gebaudereinigung',
  'reinigungsdienstleistung', 'reinigungsdienstleistungen', 'reinigungsdienste',
  'reinigungsleistung', 'reinigungsleistungen', 'reinigungsvertrag', 'reinigungsauftrag',
  'reinigungsdienst', 'putzdienst', 'putzleistung', 'putzleistungen',
  'objektreinigung', 'glasreinigung', 'fensterreinigung', 'fassadenreinigung',
  'treppenhausreinigung', 'büroreinigung', 'bueroreinigung', 'schulreinigung',
  'krankenhausreinigung', 'hotelreinigung', 'industriereinigung als dienst',
  'facility management reinigung', 'fm-reinigung', 'fm reinigung',
  'gebäudeservice reinigung', 'gebaeudeservice reinigung',
  'reinigung schulgebäude', 'reinigung schulgebaeude', 'reinigung schulgebäudes',
  'reinigung von schulgebäuden', 'schulgebäude reinigung', 'schulgebaeude reinigung',
  'cleaning services', 'cleaning service', 'janitorial', 'janitorial services',
  'building cleaning', 'office cleaning', 'window cleaning', 'facade cleaning',
  'contract cleaning', 'cleaning contract', 'cleaning tender',
  'prestation de nettoyage', 'nettoyage de bâtiment', 'nettoyage de batiment',
  'nettoyage des locaux', 'entretien des locaux', 'nettoyage industriel prestation',
  'schoonmaakdiensten', 'gebouwenreiniging', 'onderhoudsreiniging',
  'usługi sprzątania', 'sprzątanie budynków', 'sprzatanie budynkow',
  'limpieza de edificios', 'servicio de limpieza', 'servicios de limpieza',
  'pulizia edifici', 'servizio di pulizia',
  'reinigung von gebäuden', 'reinigung von gebaeuden', 'reinigung von gebäude',
];

/** Generic procurement verbs – not equipment alone (FM contracts mention „Beschaffung“ of consumables). */
const WEAK_PROCUREMENT_KEYWORDS = [
  'lieferung und montage',
  'anschaffung von',
  'beschaffung',
  'anschaffung',
  'erwerb von',
  'lieferung von',
  'rahmenvereinbarung geräte',
  'rahmenvereinbarung geraete',
];

/**
 * PHT Industriewaschanlagen / Sonderbau – Kernkompetenz (Preisliste 2026: EKW, EDW, EPW).
 * Kisten, 1000-Liter-Behälter, Paletten, Mülltonnen, Blumentöpfe – keine Gebäudereinigung.
 */
export const PHT_INDUSTRIAL_WASHER_KEYWORDS = [
  'sonderbau', 'waschanlage', 'industrie wasch', 'industriewasch', 'industriewaschanlage',
  'kistenwasch', 'kistenwäsche', 'kistenwaesche', 'kistenreinigung', 'kistenwaschanlage',
  'behälterwasch', 'behaelterwasch', 'behälterwaschanlage', 'behaelterwaschanlage',
  'palettenwasch', 'palettenwascher', 'palettenwaschanlage',
  'mülltonnenwasch', 'muelltonnenwasch', 'mülltonne', 'muelltonne', 'tonnenwasch', 'tonnenwaschanlage',
  'containerwasch', 'container wasch', 'containerreinigung',
  '1000 liter', '1000l', '1000 l',
  'blumentopf', 'blumentöpfe', 'blumentoepfe', 'blumentopfwasch',
  'waschmaschine', 'industriewaschmaschine', 'reinigungsanlage',
  'pallet washer', 'box washer', 'wheelie bin washer', 'ibc washer',
  'dolav', 'ekw-', 'epw-', 'edw-',
];

/**
 * Geräte-/Anlagen-Signale aus Preisliste 2026 – Schaumstationen, Niederdruck, Hygienestationen etc.
 * Zusätzlich zu PHT_CORE_PRODUCT_KEYWORDS (Spinde, Besen, Bürsten).
 */
export const PHT_EQUIPMENT_KEYWORDS = [
  ...PHT_INDUSTRIAL_WASHER_KEYWORDS,
  'schaumstation', 'schaumstationen', 'schaumanlage', 'schaumreinigungsanlage',
  'hauptstation', 'satellitenstation', 'satellit station', 'niederdruckanlage',
  'niederdruck-hauptstation', 'mobile hauptstation', 'automatik hauptstation',
  'bodendose', 'bodendosen', 'schäumer', 'schaeumer', 'foamer', 'foamico',
  'druckerhöhungsanlage', 'druckerhoehungsanlage', 'druckerhöhungspumpe',
  'hygienestation', 'handreinigungsbecken', 'handreinigungsrinne',
  'sohlenreiniger', 'sohlendesinfektion', 'personenschleuse',
  'behälterreinigungsanlage', 'behaelterreinigungsanlage', 'waschkabinett',
  'bürstenreinigungsstation', 'buerstenreinigungsstation',
  'schuhtrocknungssystem', 'stiefeltrockner', 'trocknungsanlage',
  'messerkorbreinigungsanlage', 'palettenreinigungsanlage', 'frontlader reinigungsanlage',
  'schürzenreinigung', 'schuerzenreinigung', 'kistenwäsche', 'kistenwaesche',
  'palettenreinigung', 'portaldrehkreuz', 'eingangskontrolle',
  'seifenspender', 'händetrockner', 'haendetrockner', 'desinfektionsmatte',
  'abfallsammler', 'schlauchaufroller', 'gabelhubwagen',
  'niederdruck', 'schaumreinigung', 'sanicare', 'waschanlage',
  'lieferung und montage', 'anschaffung', 'beschaffung', 'lieferung von',
  'anschaffung von', 'erwerb von', 'rahmenvereinbarung geräte', 'rahmenvereinbarung geraete',
  'crate washer', 'container wash', 'apron washer', 'boot washer',
];

/** PHT-Kernprodukte (Preisliste 2026) – immer stark, ohne Hygiene-Gate */
export const PHT_CORE_PRODUCT_KEYWORDS = [
  'spind', 'spinde', 'schließfach', 'schliessfach', 'schließfächer', 'schliessfaecher',
  'locker', 'lockers', 'changing locker', 'wardrobe locker',
  'garderobe', 'garderoben', 'garderobenschrank', 'wardrobe', 'wardrobes',
  'wertfachschrank', 'wertfachschränke', 'wertfach', 'valuables locker', 'safe locker',
  'umkleide', 'umkleideraum', 'umkleidekabine', 'changing room', 'changing rooms',
  'feuerwehrspind', 'feuerwehrspinde', 'firefighter locker', 'fire station locker',
  'besen', 'bürste', 'buerste', 'bürsten', 'buersten', 'schaufel', 'kehrschaufel',
  'scheuerbürste', 'scheuerbuerste', 'handbürste', 'handbuerste', 'waschbürste', 'waschbuerste',
  'reinigungsgerät', 'reinigungsgeraet', 'reinigungsgeräte', 'reinigungsgeraete',
  'reinigungsbedarf', 'reinigungsutensilien', 'cleaning brush', 'cleaning brushes',
  'broom', 'brooms', 'dustpan', 'floor brush',
];

/**
 * Spezifische Produkt-/Anlagenbegriffe – ausreichend für Match (kein generisches „Reinigung“).
 * Generische Wörter wie reinigung/cleaning/wash sind bewusst NICHT enthalten.
 */
export const PHT_STRONG_HYGIENE_KEYWORDS = [
  'desinfektion', 'disinfection', 'desinfect', 'desinfiz',
  'cip', 'gmp', 'desinfectie', 'dezynfekcja',
  'hygienestation', 'personenschleuse', 'sohlenreiniger', 'sohlendesinfektion',
  'behälterreinigung', 'behaelterreinigung', 'waschkabinett', 'kistenwäsche', 'kistenwaesche',
  'handreinigungsbecken', 'handreinigungsrinne', 'bürstenreinigung', 'buerstenreinigung',
  'schürzenreinigung', 'schuerzenreinigung', 'palettenreinigung', 'crate washer', 'container wash',
  'niederdruck', 'schaumreinigung', 'schaumstation', 'betriebshygiene', 'industrial hygiene',
  'schuhtrocknung', 'stiefeltrockner', 'messerkorb', 'portaldrehkreuz', 'eingangskontrolle',
  'hauptstation', 'satellitenstation', 'schäumer', 'schaeumer', 'foamico',
  'sonderbau', 'industriewasch', 'kistenwasch', 'behälterwasch', 'palettenwasch',
  'mülltonnenwasch', 'containerwasch', 'blumentopf', 'palettenwascher', 'waschmaschine',
];

/**
 * Schwache Kontextbegriffe – allein NICHT ausreichend (verhindert z. B. Windel-Ausschreibungen
 * mit „Krankenhaus“/„Hygiene“ im Titel).
 */
export const PHT_WEAK_CONTEXT_KEYWORDS = [
  'hygiene', 'hygien', 'hospital', 'spital', 'krankenhaus', 'klinik', 'clinic',
  'pharma', 'food', 'lebensmittel', 'medical', 'medizin', 'nursing',
  'sanitär', 'sanitar', 'sanitary', 'facility', 'betrieb', 'production',
  'industrial', 'staff', 'personal', 'personnel', 'steril',
  'reinigung', 'reinigen', 'cleaning', 'clean', 'wash', 'washing', 'wasch',
  'nettoyage', 'reiniging', 'schoonmaak', 'pulizia', 'limpieza', 'sanitation',
  'provision', 'framework', 'rahmenvereinbarung', 'rahmenvertrag', 'services', 'service',
  'dienstleistung', 'dienstleistungen', 'system', 'consulting', 'beratung',
];

const MIN_SUBSTRING_KEYWORD_LEN = 4;

/** Wortgrenzen für kurze Preislisten-Tokens (z. B. „min“ in „minibus“). */
export function keywordMatchesInText(text, kw) {
  const lower = String(text || '').toLowerCase();
  const term = String(kw || '').toLowerCase();
  if (!term) return false;
  if (term.length < MIN_SUBSTRING_KEYWORD_LEN) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9äöüß])${escaped}(?:[^a-z0-9äöüß]|$)`, 'i').test(lower);
  }
  return lower.includes(term);
}

export function textHasExclusion(text) {
  const lower = String(text || '').toLowerCase();
  return PHT_EXCLUSION_KEYWORDS.some((kw) => lower.includes(kw));
}

export function textHasTransportServiceExclusion(text) {
  const lower = String(text || '').toLowerCase();
  if (!lower.trim()) return false;
  if (!PHT_TRANSPORT_SERVICE_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  return !hasStrongEquipmentSignal(lower);
}

export function textHasItConsultingExclusion(text) {
  const lower = String(text || '').toLowerCase();
  if (!PHT_IT_CONSULTING_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  return !hasStrongEquipmentSignal(lower);
}

export function textHasCateringExclusion(text) {
  const lower = String(text || '').toLowerCase();
  if (!PHT_CATERING_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  return !hasStrongEquipmentSignal(lower);
}

function isFoodSupplyOnlyProcurement(text) {
  const lower = String(text || '').toLowerCase();
  if (!PHT_FOOD_SUPPLY_ONLY_PHRASES.some((kw) => lower.includes(kw))) return false;
  return !PHT_FOOD_FACILITY_BUILD_VERBS.some((kw) => lower.includes(kw));
}

/** Lebensmittelbetrieb-Umbau/Zubau/Neubau – PHT-Ausrüstungschance (kein reines Baugeschäft). */
export function hasFoodFacilityOpportunitySignal(text) {
  const lower = String(text || '').toLowerCase();
  if (!lower.trim()) return false;
  if (isFoodSupplyOnlyProcurement(lower)) return false;
  if (PHT_FOOD_FACILITY_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  const hasBuildVerb = PHT_FOOD_FACILITY_BUILD_VERBS.some((kw) => lower.includes(kw));
  const hasFoodCtx = PHT_FOOD_CONTEXT_TERMS.some((kw) => lower.includes(kw));
  return hasBuildVerb && hasFoodCtx;
}

/**
 * Generisches Bauen/Sanieren ohne Food-/Hygienebezug ausschließen.
 * Lebensmittelbetrieb-Projekte bleiben erlaubt (hasFoodFacilityOpportunitySignal).
 */
export function textHasGenericConstructionExclusion(text) {
  const lower = String(text || '').toLowerCase();
  if (!lower.trim()) return false;
  if (hasStrongEquipmentSignal(lower)) return false;
  if (hasFoodFacilityOpportunitySignal(lower)) return false;
  if (passesHygieneGate(lower)) return false;

  if (PHT_GENERIC_CONSTRUCTION_KEYWORDS.some((kw) => lower.includes(kw))) return true;

  const hasBuildVerb = PHT_FOOD_FACILITY_BUILD_VERBS.some((kw) => lower.includes(kw));
  if (hasBuildVerb) return true;

  return /\b(sanierung|renovation|renovierung|refurbishment|refurbish)\b/.test(lower);
}

/**
 * Generische Beschaffungsbegriffe ohne Gerätebezug – z. B. „framework agreement“, „provision“, „services“.
 */
export function isGenericProcurementOnly(text) {
  const lower = String(text || '').toLowerCase();
  if (!lower.trim()) return false;
  if (hasStrongEquipmentSignal(lower) || hasCoreProductSignal(lower)) return false;
  if (hasEquipmentSignal(lower)) return false;
  if (hasFoodFacilityOpportunitySignal(lower)) return false;

  const genericPhrases = [
    /\bprovision\b/,
    /\bframework\b/,
    /\brahmenvereinbarung\b/,
    /\brahmenvertrag\b/,
    /\bdynamic purchasing\b/,
    /\bdynamisches beschaffungssystem\b/,
    /\bdps\b/,
  ];
  if (genericPhrases.some((re) => re.test(lower))) return true;

  const servicesAlone = /\bservices?\b/.test(lower) || /\bdienstleistung(en)?\b/.test(lower);
  const systemAlone = /\bsystem\b/.test(lower);
  if ((servicesAlone || systemAlone) && !hasEquipmentSignal(lower)) return true;

  return false;
}

/** DPS/Rahmenbeschaffung ohne Gerätebezug – typisch FM/Transport/Architektur. */
export function isDpsWithoutEquipment(text) {
  const lower = String(text || '').toLowerCase();
  const isDps = lower.includes('dynamic purchasing system')
    || lower.includes('dynamisches beschaffungssystem')
    || /\bdps\b/.test(lower);
  if (!isDps) return false;
  return !hasEquipmentSignal(lower);
}

export function textHasNonPHTServiceExclusion(text) {
  if (textHasTransportServiceExclusion(text)) return true;
  if (textHasItConsultingExclusion(text)) return true;
  if (textHasCateringExclusion(text)) return true;
  if (textHasGenericConstructionExclusion(text)) return true;
  if (isGenericProcurementOnly(text)) return true;
  if (isDpsWithoutEquipment(text)) return true;
  return false;
}

/** Score ≥70 (GO) mit Ausrüstungs-, Katalog-, Food-Facility+Gerät-, CPV- oder Preislisten-Signal. */
export function qualifiesForGoScore(
  text,
  cpvCodes = [],
  priceListArticleMatch = false,
  cpvEquipmentFn = null,
  catalogStrongMatch = false,
) {
  if (hasStrongEquipmentSignal(text)) return true;
  if (catalogStrongMatch) return true;
  if (hasFoodFacilityOpportunitySignal(text)) return true;
  if (priceListArticleMatch) return true;
  const isEquipment = cpvEquipmentFn ?? (() => false);
  if (isEquipment(cpvCodes)) return true;
  return false;
}

export function isWeakPriceListFragment(kw) {
  return PHT_WEAK_PRICE_LIST_FRAGMENTS.includes(String(kw || '').toLowerCase());
}

export function weakPriceListFragmentMatches(text, kw) {
  if (!keywordMatchesInText(text, kw)) return false;
  if (!isWeakPriceListFragment(kw)) return true;
  return hasEquipmentSignal(text) || passesHygieneGate(text);
}

export function hasIndustrialWasherSignal(text) {
  const lower = String(text || '').toLowerCase();
  return PHT_INDUSTRIAL_WASHER_KEYWORDS.some((kw) => lower.includes(kw));
}

export function hasServiceOnlySignal(text) {
  const lower = String(text || '').toLowerCase();
  return PHT_SERVICE_ONLY_KEYWORDS.some((kw) => lower.includes(kw));
}

export function hasStrongEquipmentSignal(text) {
  const lower = String(text || '').toLowerCase();
  if (PHT_CORE_PRODUCT_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  return PHT_EQUIPMENT_KEYWORDS.some((kw) => {
    if (WEAK_PROCUREMENT_KEYWORDS.includes(kw)) return false;
    return lower.includes(kw);
  });
}

export function hasEquipmentSignal(text) {
  const lower = String(text || '').toLowerCase();
  if (hasStrongEquipmentSignal(lower)) return true;
  const hasWeakProcurement = WEAK_PROCUREMENT_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasWeakProcurement) return false;
  return PHT_STRONG_HYGIENE_KEYWORDS.some((kw) => lower.includes(kw))
    || PHT_CORE_PRODUCT_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Reine Reinigungsdienstleistung ohne Ausrüstungsbezug – für Filter und Scoring.
 */
export function isPureCleaningService(text) {
  const lower = String(text || '').toLowerCase();
  if (!lower.trim()) return false;
  if (hasServiceOnlySignal(lower) && !hasStrongEquipmentSignal(lower)) return true;
  if (hasStrongEquipmentSignal(lower)) return false;

  // Muster: „Reinigung“ + Gebäude/Kontext + Vertragsdauer ohne Geräte
  const servicePatterns = [
    /\breinigung\b.{0,40}\b(schul|gebäude|gebaeude|krankenhaus|büro|buero|objekt|hotel)\b/,
    /\b(unterhalts|gebäude|gebaeude|objekt|glas|fenster|fassaden|treppenhaus)\s*reinigung\b/,
    /\breinigung\b.{0,30}\b(\d+\s*(jahre?|monate?|j\.))\b/,
    /\b(jahre?|monate?)\b.{0,30}\breinigung\b/,
    /\b(cleaning|nettoyage|schoonmaak)\s+(services?|contract|prestation)\b/,
    /\b(janitorial|putzdienst|reinigungsvertrag)\b/,
  ];
  return servicePatterns.some((re) => re.test(lower));
}

export function hasStrongHygieneContext(text) {
  const lower = String(text || '').toLowerCase();
  if (hasEquipmentSignal(lower)) return true;
  if (hasFoodFacilityOpportunitySignal(lower)) return true;
  return PHT_STRONG_HYGIENE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function hasWeakHygieneContext(text) {
  const lower = String(text || '').toLowerCase();
  return PHT_WEAK_CONTEXT_KEYWORDS.some((kw) => lower.includes(kw));
}

export function hasCoreProductSignal(text) {
  const lower = String(text || '').toLowerCase();
  return PHT_CORE_PRODUCT_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Hygiene-Gate: nur spezifische Produktbegriffe oder Ausrüstung – kein generisches „Reinigung“ */
export function passesHygieneGate(text) {
  if (isPureCleaningService(text)) return false;
  if (hasEquipmentSignal(text)) return true;
  if (PHT_STRONG_HYGIENE_KEYWORDS.some((kw) => String(text || '').toLowerCase().includes(kw))) return true;
  return false;
}

/**
 * Reinigungsdienstleistung ohne Ausrüstungsbezug (Text und/oder reine Service-CPV).
 * Wird von matchesPHT und scoreTender genutzt.
 */
export function isServiceOnlyCleaning(
  text,
  cpvCodes = [],
  cpvServiceFn = null,
  cpvEquipmentFn = null,
) {
  if (hasStrongEquipmentSignal(text)) return false;
  if (isPureCleaningService(text)) return true;
  const isService = cpvServiceFn ?? (() => false);
  const isEquipment = cpvEquipmentFn ?? (() => false);
  if (isService(cpvCodes) && !isEquipment(cpvCodes)) return true;
  return false;
}
