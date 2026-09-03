export interface BcSalesperson {
  code: string;
  name: string;
  email?: string;
  customerNumbers: string[];
  customerCount: number;
  bundeslaender: string[];
  gebietsSource?: 'bc_custom' | 'derived' | 'none';
}

export interface BcSalesTeamResponse {
  configured: boolean;
  setupRequired?: boolean;
  salespeople: BcSalesperson[];
  gebietsCustomAvailable?: boolean;
  fetchedAt?: string;
  error?: string;
}

export interface FallbackColleague {
  code: string;
  name: string;
  customerNumbers: string[];
  customerCount: number;
  bundeslaender: string[];
  isFallback: true;
}

export type ColleagueTab = BcSalesperson | FallbackColleague;
