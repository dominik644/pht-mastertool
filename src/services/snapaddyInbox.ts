import type { SnapaddyCard } from '../types/snapaddy';
import type { CustomerPriority } from '../types/customerPriority';
import { classifySector } from '../../lib/phtCustomerProfile.js';
import { addLocalCustomer } from './localCustomersStorage';
import { getCustomerDetails, updateCustomerDetails } from './customerDetailsStorage';
import type { ContactPerson } from '../types/customerDetails';

const LOCAL_INBOX_KEY = 'pht-snapaddy-inbox';

function loadLocalInbox(): SnapaddyCard[] {
  try {
    const raw = localStorage.getItem(LOCAL_INBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SnapaddyCard[];
    return Array.isArray(parsed) ? parsed.filter((c) => c.status === 'pending') : [];
  } catch {
    return [];
  }
}

function saveLocalInbox(cards: SnapaddyCard[]): void {
  localStorage.setItem(LOCAL_INBOX_KEY, JSON.stringify(cards));
}

export function addLocalSnapaddyCard(partial: Partial<SnapaddyCard> & { company?: string; fullName?: string }): SnapaddyCard {
  const fullName = partial.fullName
    || [partial.firstName, partial.lastName].filter(Boolean).join(' ').trim();
  const card: SnapaddyCard = {
    id: partial.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    firstName: partial.firstName ?? '',
    lastName: partial.lastName ?? '',
    fullName,
    email: partial.email ?? '',
    phone: partial.phone ?? '',
    role: partial.role ?? '',
    company: partial.company ?? '',
    street: partial.street ?? '',
    zip: partial.zip ?? '',
    city: partial.city ?? '',
    country: partial.country ?? 'AT',
    website: partial.website ?? '',
    receivedAt: new Date().toISOString(),
    status: 'pending',
  };
  saveLocalInbox([card, ...loadLocalInbox().filter((c) => c.id !== card.id)]);
  return card;
}

export function mergeSnapaddyInboxes(serverCards: SnapaddyCard[]): SnapaddyCard[] {
  const packed = ingestPackedCardFromUrl();
  const local = loadLocalInbox();
  const ids = new Set(serverCards.map((c) => c.id));
  const extra = packed && !ids.has(packed.id) ? [packed] : [];
  return [...serverCards, ...extra, ...local.filter((c) => !ids.has(c.id) && c.id !== packed?.id)];
}

function ingestPackedCardFromUrl(): SnapaddyCard | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const packed = params.get('card');
  if (!packed) return null;
  try {
    const padded = packed.replace(/-/g, '+').replace(/_/g, '/');
    const b64 = padded + '='.repeat((4 - (padded.length % 4)) % 4);
    const decoded = JSON.parse(atob(b64)) as SnapaddyCard;
    if (!decoded?.id) return null;
    const card = addLocalSnapaddyCard(decoded);
    params.delete('card');
    const next = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, '');
    window.history.replaceState({}, '', next);
    return card;
  } catch {
    return null;
  }
}

export function removeLocalSnapaddyCard(id: string): void {
  saveLocalInbox(loadLocalInbox().filter((c) => c.id !== id));
}

export async function fetchSnapaddyInbox(): Promise<SnapaddyCard[]> {
  try {
    const res = await fetch('/api/snapaddy', { credentials: 'include' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(body.cards)) return [];
    return body.cards as SnapaddyCard[];
  } catch {
    return [];
  }
}

export async function markSnapaddyCard(
  id: string,
  status: 'applied' | 'dismissed',
): Promise<void> {
  await fetch('/api/snapaddy', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  });
}

function contactFromCard(card: SnapaddyCard): ContactPerson {
  return {
    id: `snap-${card.id || Date.now().toString(36)}`,
    name: card.fullName,
    email: card.email,
    phone: card.phone,
    role: card.role,
  };
}

export function applySnapaddyToExisting(card: SnapaddyCard, customer: CustomerPriority): void {
  const details = getCustomerDetails(customer.id);
  const next = contactFromCard(card);
  const existing = details.ansprechperson;
  const hasPrimary = Boolean(existing.name || existing.email || existing.phone);

  if (!hasPrimary) {
    details.ansprechperson = next;
  } else {
    const extras = details.additionalContacts ?? [];
    const dup = extras.some(
      (c) => (c.email && next.email && c.email.toLowerCase() === next.email.toLowerCase())
        || (c.name && next.name && c.name.toLowerCase() === next.name.toLowerCase()),
    );
    const samePrimary = existing.email && next.email
      && existing.email.toLowerCase() === next.email.toLowerCase();
    if (!dup && !samePrimary) {
      details.additionalContacts = [...extras, next];
    } else if (samePrimary) {
      details.ansprechperson = {
        id: existing.id || next.id,
        name: next.name || existing.name,
        email: next.email || existing.email,
        phone: next.phone || existing.phone,
        role: next.role || existing.role,
      };
    }
  }

  if (card.street && !details.rechnungsadresse.street) {
    details.rechnungsadresse = {
      street: card.street,
      plz: card.zip || details.rechnungsadresse.plz,
      ort: card.city || details.rechnungsadresse.ort,
      land: card.country || details.rechnungsadresse.land,
    };
  }
  updateCustomerDetails(customer.id, details);
}

export function applySnapaddyAsNewCustomer(
  card: SnapaddyCard,
  ownerName: string,
): CustomerPriority {
  const sector = classifySector(card.company || card.fullName);
  const slug = (card.company || card.fullName || 'kontakt')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48);
  const customer: CustomerPriority = {
    id: `snapaddy-${card.id}-${slug}`,
    customerNumber: null,
    name: card.company || card.fullName || 'Snapaddy Kontakt',
    city: card.city,
    zip: card.zip,
    country: card.country || 'AT',
    bundesland: null,
    sector: sector.id,
    sectorLabel: sector.label,
    priority: 'B',
    potentialScore: 40,
    visitCadenceMonths: 12,
    source: 'snapaddy',
    owner: ownerName,
    salesRep: ownerName,
    excelAbc: null,
    excelScore: null,
    excelStatus: null,
    active2026: true,
    daysSincePurchase: null,
    exchangePotential: [],
    isMeatIndustry: Boolean(sector.meat),
    isNewLead: true,
    discoveredAt: new Date().toISOString(),
    contactEmail: card.email || null,
    contactPhone: card.phone || null,
    enrichmentSource: 'snapaddy',
    enrichedAt: new Date().toISOString(),
  };
  addLocalCustomer(customer);
  updateCustomerDetails(customer.id, {
    ...getCustomerDetails(customer.id),
    ansprechperson: contactFromCard(card),
    rechnungsadresse: {
      street: card.street,
      plz: card.zip,
      ort: card.city,
      land: card.country || 'AT',
    },
  });
  return customer;
}
