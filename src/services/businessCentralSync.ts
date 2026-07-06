import { mergeBcSyncResults } from './customerDetailsStorage';
import type { CustomerDetails } from '../types/customerDetails';

export interface BcSyncStatus {
  configured: boolean;
  tenantId: boolean;
  clientId: boolean;
  clientSecret: boolean;
  environment: string | null;
  companyId: string | null;
  message?: string;
}

export interface BcSyncResult {
  configured: boolean;
  syncedAt?: string;
  bcCustomerCount?: number;
  matches?: Array<{ localCustomerId: string; bcCustomerNumber: string; details: Record<string, unknown> }>;
  unmatchedLocal?: Array<{ id: string; name: string; customerNumber?: string | null }>;
  unmatchedBcCount?: number;
  notesPushed?: number;
  notesPushSupported?: boolean;
  notesCandidates?: number;
  notesHint?: string;
  error?: string;
  setupRequired?: boolean;
}

export async function fetchBcSyncStatus(): Promise<BcSyncStatus> {
  const res = await fetch('/api/bc-sync');
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
}

export async function runBcSync(
  customers: Array<{ id: string; customerNumber?: string | null; name: string; notes?: string }>,
): Promise<{ result: BcSyncResult; merged: number }> {
  const res = await fetch('/api/bc-sync', {
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
  return { result, merged };
}
