/**
 * Zentrale Match-/Ausschlussregeln für PHT-Tenderfilterung und Scoring.
 * Wird von Provider-Filtern, Preislisten-Matching und Scoring genutzt.
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

/** Starke Hygiene-/Reinigungsbegriffe – allein ausreichend für Match */
export const PHT_STRONG_HYGIENE_KEYWORDS = [
  'reinigung', 'reinigen', 'cleaning', 'clean', 'wash', 'washing', 'wasch',
  'desinfektion', 'disinfection', 'desinfect', 'desinfiz', 'sanitation',
  'cip', 'gmp', 'nettoyage', 'reiniging', 'desinfectie', 'dezynfekcja',
  'hygienestation', 'personenschleuse', 'sohlenreiniger', 'sohlendesinfektion',
  'behälterreinigung', 'behaelterreinigung', 'waschkabinett', 'kistenwäsche', 'kistenwaesche',
  'handreinigungsbecken', 'handreinigungsrinne', 'bürstenreinigung', 'buerstenreinigung',
  'schürzenreinigung', 'schuerzenreinigung', 'palettenreinigung', 'crate washer', 'container wash',
  'niederdruck', 'schaumreinigung', 'betriebshygiene', 'industrial hygiene',
  'schuhtrocknung', 'stiefeltrockner', 'messerkorb', 'portaldrehkreuz', 'eingangskontrolle',
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
];

export function textHasExclusion(text) {
  const lower = String(text || '').toLowerCase();
  return PHT_EXCLUSION_KEYWORDS.some((kw) => lower.includes(kw));
}

export function hasStrongHygieneContext(text) {
  const lower = String(text || '').toLowerCase();
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

/** Hygiene-Gate für schwache Preislisten-Treffer – schwacher Kontext allein reicht nicht */
export function passesHygieneGate(text) {
  if (hasStrongHygieneContext(text)) return true;
  if (hasCoreProductSignal(text)) return true;
  return false;
}
