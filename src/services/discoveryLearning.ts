import {
  buildDiscoveryProfile,
  emptyDiscoveryProfile,
  scoreDiscoveryLead,
  shouldSkipDiscoveryLead,
  LEAD_REASON_PRESETS,
} from '../../lib/discoveryLearning.js';
import { loadSalesFeedback, SALES_FEEDBACK_STORAGE_KEY } from '../../lib/salesLearning.js';

export const DISCOVERY_LEARNING_STORAGE_KEY = 'pht-discovery-learning';
export const DISCOVERY_LEARNING_CHANGED_EVENT = 'pht-discovery-learning-changed';

export type DiscoveryProfile = ReturnType<typeof emptyDiscoveryProfile>;

export { LEAD_REASON_PRESETS, scoreDiscoveryLead, shouldSkipDiscoveryLead };

export function loadDiscoveryProfile(): DiscoveryProfile {
  if (typeof localStorage === 'undefined') return emptyDiscoveryProfile();
  try {
    const raw = localStorage.getItem(DISCOVERY_LEARNING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DiscoveryProfile;
      if (parsed?.version) return parsed;
    }
  } catch {
    /* rebuild below */
  }
  return rebuildDiscoveryProfile();
}

export function rebuildDiscoveryProfile(
  customerMeta?: Record<string, { sector?: string; name?: string }>,
): DiscoveryProfile {
  const store = loadSalesFeedback();
  const profile = buildDiscoveryProfile(store, customerMeta);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DISCOVERY_LEARNING_STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent(DISCOVERY_LEARNING_CHANGED_EVENT));
  }
  return profile;
}

export function exportDiscoveryProfileJson(): string {
  return JSON.stringify(loadDiscoveryProfile(), null, 2);
}

export { SALES_FEEDBACK_STORAGE_KEY };
