export interface ScheduleProposalResult {
  ok: boolean;
  configured: boolean;
  skipped?: boolean;
  error?: string;
  proposalId?: string;
  slotCount?: number;
  sentTo?: string;
  message?: string;
}

export async function fetchScheduleProposalStatus(): Promise<{ configured: boolean; skipped?: boolean }> {
  try {
    const res = await fetch('/api/schedule-proposal', { method: 'OPTIONS' });
    return { configured: res.ok };
  } catch {
    return { configured: false, skipped: true };
  }
}

export async function sendScheduleProposal(params: {
  customerId: string;
  customerEmail?: string;
  territory?: string;
}): Promise<ScheduleProposalResult> {
  try {
    const res = await fetch('/api/schedule-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 503) {
      return {
        ok: false,
        configured: false,
        skipped: body.skipped === true,
        error: body.error ?? 'Terminvorschläge nicht konfiguriert',
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        configured: body.configured !== false,
        error: body.error ?? `Fehler ${res.status}`,
      };
    }
    return {
      ok: true,
      configured: true,
      proposalId: body.proposalId,
      slotCount: body.slotCount,
      sentTo: body.sentTo,
      message: `Terminvorschläge (${body.slotCount} Slots) an ${body.sentTo} gesendet`,
    };
  } catch (err) {
    return {
      ok: false,
      configured: false,
      error: err instanceof Error ? err.message : 'Netzwerkfehler',
    };
  }
}
