import type { CustomerFeedback } from './salesLearning';
import type { CustomerVisitState } from '../types/customerPriority';

export interface SalesSyncStatus {
  configured: boolean;
  skipped?: boolean;
}

const DEFAULT_TERRITORY = 'Vertrieb Ost';

export async function fetchSalesSyncStatus(): Promise<SalesSyncStatus> {
  try {
    const res = await fetch('/api/sales-sync?type=feedback');
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      return { configured: false, skipped: body.skipped === true };
    }
    return { configured: res.ok };
  } catch {
    return { configured: false, skipped: true };
  }
}

export async function loadFeedbackFromSupabase(
  territory = DEFAULT_TERRITORY,
): Promise<Record<string, CustomerFeedback> | null> {
  try {
    const res = await fetch(`/api/sales-sync?type=feedback&territory=${encodeURIComponent(territory)}`);
    if (!res.ok) return null;
    const body = await res.json();
    const raw = body.feedback as Record<string, {
      lead_rating?: string | null;
      visit_relevant?: boolean | null;
      visit_outcome?: string | null;
      sector_hits?: string[];
      positive_count?: number;
      negative_count?: number;
      updated_at?: string;
    }> | undefined;
    if (!raw) return null;

    const map: Record<string, CustomerFeedback> = {};
    for (const [id, row] of Object.entries(raw)) {
      map[id] = {
        leadRating: (row.lead_rating as CustomerFeedback['leadRating']) ?? null,
        visitRelevant: row.visit_relevant ?? null,
        visitOutcome: (row.visit_outcome as CustomerFeedback['visitOutcome']) ?? null,
        sectorHits: row.sector_hits ?? [],
        positiveCount: row.positive_count ?? 0,
        negativeCount: row.negative_count ?? 0,
        updatedAt: row.updated_at ?? new Date().toISOString(),
      };
    }
    return map;
  } catch {
    return null;
  }
}

export async function loadVisitsFromSupabase(
  territory = DEFAULT_TERRITORY,
): Promise<Record<string, CustomerVisitState> | null> {
  try {
    const res = await fetch(`/api/sales-sync?type=visits&territory=${encodeURIComponent(territory)}`);
    if (!res.ok) return null;
    const body = await res.json();
    const raw = body.visits as Record<string, {
      last_visit?: string | null;
      next_due?: string | null;
      scheduled_visit?: string | null;
      notes?: string;
      archived?: boolean;
    }> | undefined;
    if (!raw) return null;

    const map: Record<string, CustomerVisitState> = {};
    for (const [id, row] of Object.entries(raw)) {
      map[id] = {
        lastVisit: row.last_visit ?? null,
        nextDue: row.next_due ?? null,
        scheduledVisit: row.scheduled_visit ?? null,
        notes: row.notes ?? '',
        archived: row.archived ?? false,
      };
    }
    return map;
  } catch {
    return null;
  }
}

export async function syncFeedbackToSupabase(
  customerId: string,
  feedback: CustomerFeedback,
  territory = DEFAULT_TERRITORY,
): Promise<void> {
  try {
    await fetch('/api/sales-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'feedback',
        customerId,
        territory,
        payload: {
          leadRating: feedback.leadRating,
          visitRelevant: feedback.visitRelevant,
          visitOutcome: feedback.visitOutcome,
          sectorHits: feedback.sectorHits,
          positiveCount: feedback.positiveCount,
          negativeCount: feedback.negativeCount,
          updatedAt: feedback.updatedAt,
        },
      }),
    });
  } catch {
    // graceful fallback – localStorage remains source of truth offline
  }
}

export async function syncVisitToSupabase(
  customerId: string,
  visit: CustomerVisitState,
  eventType = 'update',
  territory = DEFAULT_TERRITORY,
): Promise<void> {
  try {
    await fetch('/api/sales-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'visit',
        customerId,
        territory,
        payload: {
          lastVisit: visit.lastVisit,
          nextDue: visit.nextDue,
          scheduledVisit: visit.scheduledVisit ?? null,
          notes: visit.notes,
          archived: visit.archived,
          eventType,
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  } catch {
    // graceful fallback
  }
}

export async function hydrateSalesDataFromSupabase(territory = DEFAULT_TERRITORY): Promise<void> {
  const [feedback, visits] = await Promise.all([
    loadFeedbackFromSupabase(territory),
    loadVisitsFromSupabase(territory),
  ]);

  if (feedback && Object.keys(feedback).length > 0) {
    const { loadSalesFeedback, SALES_FEEDBACK_STORAGE_KEY } = await import('./salesLearning');
    const local = loadSalesFeedback();
    const merged = { ...feedback, ...local };
    localStorage.setItem(SALES_FEEDBACK_STORAGE_KEY, JSON.stringify(merged));
  }

  if (visits && Object.keys(visits).length > 0) {
    const { loadVisitStore, saveVisitStore } = await import('./customerVisitStorage');
    const local = loadVisitStore();
    saveVisitStore({ ...visits, ...local });
  }
}
