export interface PHTProduct {
  id: string;
  name: string;
  category: string;
  priceMin: number;
  priceMax: number;
  keywords: string[];
}

export const PHT_PRODUCTS: PHTProduct[] = [
  {
    id: 'ewg',
    name: 'EWG Handhygiene-System',
    category: 'Handhygiene',
    priceMin: 2000,
    priceMax: 15000,
    keywords: ['hand', 'hygiene', 'desinfektion', 'spender', 'waschbecken', 'ewg'],
  },
  {
    id: 'spender',
    name: 'Hygiene-Spender',
    category: 'Spender',
    priceMin: 500,
    priceMax: 8000,
    keywords: ['spender', 'seife', 'desinfektion', 'papier', 'tissue'],
  },
  {
    id: 'sanicare',
    name: 'SANICARE Eingangssystem',
    category: 'Eingangssysteme',
    priceMin: 15000,
    priceMax: 80000,
    keywords: ['eingang', 'schleuse', 'sanicare', 'hygienestation', 'personenschleuse'],
  },
  {
    id: 'dzw',
    name: 'DZW Sohlenreiniger',
    category: 'Sohlenreiniger',
    priceMin: 8000,
    priceMax: 45000,
    keywords: ['sohle', 'schuh', 'boden', 'eingang', 'dzw', 'ezr'],
  },
  {
    id: 'combi',
    name: 'COMBI Hygienestation',
    category: 'Hygienestationen',
    priceMin: 12000,
    priceMax: 60000,
    keywords: ['hygienestation', 'combi', 'wasch', 'desinfektion', 'station'],
  },
  {
    id: 'niederdruck',
    name: 'Niederdruck-Reinigungssystem',
    category: 'Reinigungssysteme',
    priceMin: 25000,
    priceMax: 200000,
    keywords: ['reinigung', 'niederdruck', 'waschen', 'cleaning', 'washing'],
  },
  {
    id: 'ekw',
    name: 'EKW Industrieanlage',
    category: 'Industrieanlagen',
    priceMin: 100000,
    priceMax: 5000000,
    keywords: ['industrie', 'anlage', 'produktion', 'food', 'pharma', 'ekw', 'komplett'],
  },
  {
    id: 'waschbecken',
    name: 'Industriewaschbecken',
    category: 'Waschbecken',
    priceMin: 1000,
    priceMax: 12000,
    keywords: ['waschbecken', 'wasch', 'becken', 'hygiene'],
  },
];
