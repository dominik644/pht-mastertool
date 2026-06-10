const STORAGE_KEY = 'pht_alert_rules';

export interface AlertRule {
  id: string;
  name: string;
  minScore: number;
  regions: string[];
  categories: ('A' | 'B' | 'C')[];
  deadlineDaysMax: number;
  emailOnMatch: boolean;
  enabled: boolean;
}

const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'must-win-dach',
    name: 'Must-Win DACH',
    minScore: 70,
    regions: ['DACH', 'Europa'],
    categories: ['B', 'C'],
    deadlineDaysMax: 30,
    emailOnMatch: true,
    enabled: true,
  },
  {
    id: 'urgent-go',
    name: 'Dringende GO-Chancen',
    minScore: 60,
    regions: [],
    categories: ['A', 'B', 'C'],
    deadlineDaysMax: 14,
    emailOnMatch: true,
    enabled: true,
  },
];

export function loadAlertRules(): AlertRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AlertRule[]) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveAlertRules(rules: AlertRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function matchAlertRules<T extends {
  score: number;
  region: string;
  category: string;
  deadline: string;
  scoreRecommendation: string;
}>(tender: T, rules: AlertRule[]): AlertRule[] {
  const daysLeft = Math.ceil((new Date(tender.deadline).getTime() - Date.now()) / 86400000);
  return rules.filter((r) => {
    if (!r.enabled) return false;
    if (tender.scoreRecommendation === 'NO-GO') return false;
    if (tender.score < r.minScore) return false;
    if (r.regions.length && !r.regions.includes(tender.region)) return false;
    if (r.categories.length && !r.categories.includes(tender.category as 'A' | 'B' | 'C')) return false;
    if (daysLeft < 0 || daysLeft > r.deadlineDaysMax) return false;
    return true;
  });
}
