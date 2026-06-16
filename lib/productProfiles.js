/**
 * PHT Produktprofile – Vertriebszuordnung (Ausrüstung, keine Reinigungsdienstleistungen)
 */

export const PRODUCT_PROFILES = [
  {
    id: 'personalhygiene',
    name: 'Personalhygiene',
    icon: '🧴',
    description: 'Handhygiene, Spender, Waschstationen – Eingang, Umkleide, Produktionsbereich',
    useCases: ['Eingangsbereich', 'Umkleide', 'Personalschleuse', 'Kantine'],
    keywords: ['hygienestation', 'handreinigungsbecken', 'seifenspender', 'händetrockner', 'eingangskontrolle', 'personenschleuse', 'handdesinfektion', 'ewg', 'hdt', 'hst'],
    products: ['EWG Handhygiene-System', 'COMBI Hygienestation', 'Handreinigungsbecken EWG', 'Eingangskontrolle HDT/HST'],
  },
  {
    id: 'schaumniederdruck',
    name: 'Schaum- & Niederdrucktechnik',
    icon: '🫧',
    description: 'Schaumstationen, Haupt-/Satellitenstationen, Schäumer – Hallen, Werkstätten, Logistik',
    useCases: ['Werkstatt', 'Logistikhalle', 'Produktionsbereich', 'Fahrzeugwaschbereich'],
    keywords: [
      'schaumstation', 'hauptstation', 'satellitenstation', 'niederdruck', 'niederdruckanlage',
      'schäumer', 'schaeumer', 'foamico', 'schaumreinigung', 'bodendose', 'druckerhöhungsanlage',
      'automatik hauptstation', 'mobile hauptstation', 'fahrwagen für schaumreinigung',
    ],
    products: ['Niederdruck-Hauptstation', 'Satellitenstation', 'Automatik Hauptstation AMS', 'Schäumer', 'Fahrwagen Schaumreinigung'],
  },
  {
    id: 'industriewaschanlagen',
    name: 'Industriewaschanlagen / Sonderbau',
    icon: '🏭',
    description: 'Sonderbau-Waschanlagen für Kisten, Behälter, Paletten, Mülltonnen – Food/Pharma',
    useCases: ['Wareneingang', 'Produktionslinie', 'Logistikzentrum', 'Abfallwirtschaft'],
    keywords: [
      'sonderbau', 'waschanlage', 'industriewasch', 'kistenwasch', 'behälterwasch', 'behaelterwasch',
      'palettenwasch', 'mülltonnenwasch', 'containerwasch', 'blumentopf', '1000 liter',
      'waschkabinett', 'behälterreinigung', 'palettenwascher', 'crate washer', 'ekw', 'edw', 'epw',
      'kistenwäsche', 'container wash', 'reinigungsanlage',
    ],
    products: [
      'Behälterreinigungsanlage EKW', 'Waschkabinett EDW', 'Palettenwascher EPW',
      'Frontlader Reinigungsanlagen', 'Industriewaschanlage Sonderbau',
    ],
  },
  {
    id: 'betriebshygiene',
    name: 'Betriebshygiene',
    icon: '🚪',
    description: 'Sohlenreiniger, Eingangssysteme – Hygieneschleuse am Werks-/Krankenhaus-Eingang (kein Gebäudereinigungsvertrag)',
    useCases: ['Werkseingang', 'Krankenhaus-Eingangsbereich', 'Pharma-Schleuse', 'Lebensmittelbetrieb'],
    keywords: ['sohlenreiniger', 'sohlendesinfektion', 'sanicare', 'dzw', 'portaldrehkreuz', 'schürzenreinigung', 'stiefel', 'schuhtrocknung', 'stiefeltrockner', 'eingang'],
    products: ['SANICARE Eingangssystem', 'DZW Sohlenreiniger', 'Hygienestation COMBI', 'Sohlen- und Stiefelreiniger'],
  },
  {
    id: 'schliessfach-garderobe',
    name: 'Schließfach & Garderobe',
    icon: '🗄️',
    description: 'Spinde, Garderoben, Wertfachschränke – Umkleide, Feuerwehr, Sportstätten',
    useCases: ['Umkleide', 'Feuerwehrhaus', 'Sportstätte', 'Krankenhaus-Umkleide'],
    keywords: [
      'spind', 'spinde', 'schließfach', 'locker', 'garderobe', 'garderoben', 'wardrobe',
      'wertfachschrank', 'wertfach', 'umkleide', 'umkleideraum', 'changing room',
      'feuerwehrspind', 'feuerwehrspinde',
    ],
    products: ['Spindsysteme', 'Garderobenschränke', 'Wertfachschränke', 'Umkleideausstattung'],
  },
  {
    id: 'reinigungsgeraete',
    name: 'Reinigungsgeräte & Utensilien',
    icon: '🧹',
    description: 'Besen, Bürsten, Schaufeln, Reinigungsbedarf – Beschaffung von Geräten, keine Dienstleistung',
    useCases: ['Reinigungswagen', 'Hygienestation', 'Produktionsbereich', 'Lager'],
    keywords: [
      'besen', 'bürste', 'bürsten', 'schaufel', 'kehrschaufel', 'reinigungsgerät',
      'reinigungsgeräte', 'reinigungsbedarf', 'scheuerbürste', 'handbürste', 'waschbürste',
      'cleaning brush', 'broom', 'dustpan', 'bürstenreinigungsstation',
    ],
    products: ['Besen', 'Bürsten', 'Kehrschaufeln', 'Bürstenreinigungsstation', 'Reinigungsbedarf'],
  },
];

export function matchProductProfiles(text) {
  const lower = text.toLowerCase();
  if (/\b(unterhalts|gebäude|gebaeude|objekt)\s*reinigung\b/.test(lower)
    && !/\b(schaumstation|hauptstation|hygienestation|waschanlage|spind|besen|bürste)\b/.test(lower)) {
    return [];
  }
  return PRODUCT_PROFILES.map((profile) => {
    const hits = profile.keywords.filter((kw) => lower.includes(kw));
    return { ...profile, score: hits.length, matchedKeywords: hits };
  })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function getTopProfiles(text, limit = 2) {
  const matches = matchProductProfiles(text);
  return matches.length ? matches.slice(0, limit) : [PRODUCT_PROFILES[0]];
}
