import type { CustomerPriority } from '../types/customerPriority';
import type { Tender } from '../types/tender';
import { createOutlookEvent } from './microsoftIntegrations';
import { loadAllFunnelDeals } from './salesFunnelStorage';
import {
  markOutlookSynced,
  type ToolCalendarEvent,
} from './toolCalendar';
import {
  planConfirmedVisitInOutlook,
  planFunnelEventInOutlook,
} from './visitOutlookIntegrations';
import { createCalendarEvent } from './microsoftGraph';
import { isMicrosoftConfigured } from './microsoftAuth';

function findCustomer(customers: CustomerPriority[], event: ToolCalendarEvent): CustomerPriority | undefined {
  if (!event.customerId) return undefined;
  return customers.find((c) => c.id === event.customerId);
}

function findTender(tenders: Tender[], event: ToolCalendarEvent): Tender | undefined {
  if (!event.id.startsWith('deadline:')) return undefined;
  const tenderId = event.id.slice('deadline:'.length);
  return tenders.find((t) => t.id === tenderId);
}

function findDeal(event: ToolCalendarEvent) {
  if (!event.id.startsWith('funnel:')) return null;
  const dealId = event.id.split(':')[1];
  return loadAllFunnelDeals().find((d) => d.id === dealId) ?? null;
}

async function pushGenericSlot(event: ToolCalendarEvent): Promise<{ success: boolean; message: string }> {
  if (!event.start || !event.end) {
    return { success: false, message: 'Kein Zeitraum für den Kalendereintrag.' };
  }
  if (!isMicrosoftConfigured()) {
    return { success: false, message: 'Microsoft ist nicht verbunden – bitte oben rechts anmelden.' };
  }
  try {
    await createCalendarEvent({
      subject: event.kind === 'reminder' ? `Erinnerung: ${event.title}` : event.title,
      body: [event.subtitle, event.location].filter(Boolean).join('\n'),
      start: event.start,
      end: event.end,
      location: event.location,
    });
    return { success: true, message: 'In Outlook übernommen.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Outlook-Übernahme fehlgeschlagen' };
  }
}

export async function pushEventToOutlook(
  event: ToolCalendarEvent,
  customers: CustomerPriority[],
  tenders: Tender[] = [],
): Promise<{ success: boolean; message: string }> {
  if (!event.outlookReady) {
    return { success: false, message: 'Dieser Eintrag ist noch nicht buchbar – der Kunde muss erst bestätigen.' };
  }

  if (event.kind === 'confirmed' || event.kind === 'wish') {
    const customer = findCustomer(customers, event);
    if (customer && event.start) {
      const result = await planConfirmedVisitInOutlook(customer, event.start, event.customerEmail);
      if (result.success) markOutlookSynced([event.id]);
      return result;
    }
  }

  if (event.kind === 'tour' || event.kind === 'reminder') {
    const generic = await pushGenericSlot({
      ...event,
      title: event.kind === 'tour' ? `PHT Besuch: ${event.title}` : `Erinnerung: ${event.title}`,
    });
    if (generic.success) markOutlookSynced([event.id]);
    return generic;
  }

  if (event.kind === 'funnel') {
    const deal = findDeal(event);
    if (deal && event.date) {
      const activity = event.subtitle?.startsWith('Nachfassen') ? 'Nachfassen' : (event.subtitle || 'Nachfassen');
      const time = event.start?.split('T')[1]?.slice(0, 5);
      const result = await planFunnelEventInOutlook(deal, event.date, activity, undefined, undefined, time);
      if (result.success) markOutlookSynced([event.id]);
      return result;
    }
  }

  if (event.kind === 'deadline') {
    const tender = findTender(tenders, event);
    if (tender) {
      const result = await createOutlookEvent(tender);
      if (result.success) markOutlookSynced([event.id]);
      return result;
    }
  }

  const generic = await pushGenericSlot(event);
  if (generic.success) markOutlookSynced([event.id]);
  return generic;
}

export async function pushEventsToOutlook(
  events: ToolCalendarEvent[],
  customers: CustomerPriority[],
  tenders: Tender[] = [],
): Promise<{ ok: number; failed: number; message: string }> {
  const ready = events.filter((e) => e.outlookReady);
  let ok = 0;
  let failed = 0;
  let lastError = '';
  for (const event of ready) {
    const result = await pushEventToOutlook(event, customers, tenders);
    if (result.success) ok += 1;
    else {
      failed += 1;
      lastError = result.message;
    }
  }
  if (ok === 0 && failed === 0) {
    return { ok: 0, failed: 0, message: 'Keine übernehmbaren Termine an diesem Tag.' };
  }
  if (failed === 0) {
    return { ok, failed, message: `${ok} Termin${ok === 1 ? '' : 'e'} in Outlook übernommen.` };
  }
  return { ok, failed, message: `${ok} übernommen, ${failed} fehlgeschlagen${lastError ? ` (${lastError})` : ''}.` };
}
