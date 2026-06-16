/**
 * Zentrale Match-/Ausschlussregeln für PHT-Tenderfilterung und Scoring.
 * PHT verkauft Reinigungs-AUSRÜSTUNG (Geräte, Stationen, Utensilien) – keine Reinigungsdienstleistungen.
 */

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
  'hygiene', 'hygien', 'hospital', 'krankenhaus', 'klinik', 'clinic',
  'pharma', 'food', 'lebensmittel', 'medical', 'medizin', 'nursing',
  'sanitär', 'sanitar', 'sanitary', 'facility', 'betrieb', 'production',
  'industrial', 'staff', 'personal', 'personnel', 'steril',
  'reinigung', 'reinigen', 'cleaning', 'clean', 'wash', 'washing', 'wasch',
  'nettoyage', 'reiniging', 'schoonmaak', 'pulizia', 'limpieza', 'sanitation',
];

export function textHasExclusion(text) {
  const lower = String(text || '').toLowerCase();
  return PHT_EXCLUSION_KEYWORDS.some((kw) => lower.includes(kw));
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
