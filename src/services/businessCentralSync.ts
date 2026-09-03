import { mergeBcSyncResults } from './customerDetailsStorage';
import { mergeBcOverlayResults } from './customerBcOverlay';
import type { CustomerDetails } from '../types/customerDetails';
import type { BcSalesperson } from '../types/bcSalesTeam';

export interface BcSyncStatus {
  configured: boolean;
  tenantId: boolean;
  clientId: boolean;
  clientSecret: boolean;
  environment: string | null;
  companyId: string | null;
  message?: string;
}

export interface BcSyncMatch {
  localCustomerId: string;
  bcCustomerNumber: string;
  details: Record<string, unknown>;
  overlay?: {
    contactEmail?: string;
    contactPhone?: string;
    salesRep?: string;
    bcSalespersonCode?: string;
  };
}

export interface BcSyncResult {
  configured: boolean;
  syncedAt?: string;
  bcCustomerCount?: number;
  matches?: BcSyncMatch[];
  unmatchedLocal?: Array<{ id: string; name: string; customerNumber?: string | null }>;
  unmatchedBcCount?: number;
  salesTeam?: {
    salespeople: BcSalesperson[];
    gebietsCustomAvailable?: boolean;
  };
  notesPushed?: number;
  notesPushSupported?: boolean;
  notesCandidates?: number;
  notesHint?: string;
  error?: string;
  setupRequired?: boolean;
}

const fetchOpts: RequestInit = { credentials: 'include' };

export async function fetchBcSyncStatus(): Promise<BcSyncStatus> {
  const res = await fetch('/api/bc-sync', fetchOpts);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
}

export async function runBcSync(
  customers: Array<{ id: string; customerNumber?: string | null; name: string; notes?: string }>,
): Promise<{ result: BcSyncResult; merged: number; overlayMerged: number }> {
  const res = await fetch('/api/bc-sync', {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customers }),
  });
  const result = (await res.json()) as BcSyncResult;
  if (!res.ok) {
    throw new Error(result.error ?? `Sync fehlgeschlagen (${res.status})`);
  }
  const merged = result.matches?.length
    ? mergeBcSyncResults(
        result.matches.map((m) => ({
          localCustomerId: m.localCustomerId,
          details: m.details as Partial<CustomerDetails>,
        })),
      )
    : 0;
  const overlayMerged = result.syncedAt && result.matches?.length
    ? mergeBcOverlayResults(result.matches, result.syncedAt)
    : 0;
  return { result, merged, overlayMerged };
}
