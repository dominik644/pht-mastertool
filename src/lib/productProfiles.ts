export { PRODUCT_PROFILES, matchProductProfiles, getTopProfiles } from '../../lib/productProfiles.js';

export interface MatchedProfile {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  score?: number;
  matchedKeywords?: string[];
}
