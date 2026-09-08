import { createEmptyVisitReport, type CustomerDetails, type VisitReport } from '../types/customerDetails';
import type { CustomerPriority } from '../types/customerPriority';
import type { PlaudNote } from '../types/plaud';
import { getCustomerDetails, updateCustomerDetails } from './customerDetailsStorage';
import { getVisitState, recordVisit, resolveCadenceMonths } from './customerVisitStorage';
import { unwrapPlaudText } from '../../lib/plaudText.js';
import { addManualTodo } from './todoStorage';

const LOCAL_INBOX_KEY = 'pht-plaud-inbox';

function readLocal(): PlaudNote[] {
  try {
    const raw = localStorage.getItem(LOCAL_INBOX_KEY);
    const notes = raw ? (JSON.parse(raw) as PlaudNote[]) : [];
    return notes.map((note) => ({
      ...note,
      summary: unwrapPlaudText(note.summary),
      transcript: '',
    }));
  } catch {
    return [];
  }
}

function writeLocal(notes: PlaudNote[]) {
  localStorage.setItem(LOCAL_INBOX_KEY, JSON.stringify(notes));
}

export async function fetchPlaudAccountStatus(): Promise<{ connected: boolean; expired?: boolean; name?: string | null }> {
  const res = await fetch('/api/plaud?account=1', { credentials: 'include' });
  if (!res.ok) return { connected: false };
  const data = await res.json();
  return {
    connected: Boolean(data?.connected),
    expired: Boolean(data?.expired),
    name: typeof data?.name === 'string' ? data.name : null,
  };
}

export async function connectPlaudAccount(refreshToken: string): Promise<{ ok: boolean; connected: boolean; error?: string }> {
  const res = await fetch('/api/plaud', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'connect', refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, connected: false, error: String(data?.error || 'Verbindung fehlgeschlagen') };
  return { ok: true, connected: Boolean(data?.connected) };
}

export async function syncPlaudInbox(): Promise<{
  ok: boolean;
  imported: number;
  skipped: number;
  pending: number;
  connected?: boolean;
  error?: string;
}> {
  const res = await fetch('/api/plaud', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync' }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 412) {
    return { ok: false, imported: 0, skipped: 0, pending: 0, connected: false, error: 'not-connected' };
  }
  if (!res.ok) {
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      pending: 0,
      connected: false,
      error: String(data?.error || 'Abruf fehlgeschlagen'),
    };
  }
  return {
    ok: true,
    imported: Number(data?.imported) || 0,
    skipped: Number(data?.skipped) || 0,
    pending: Number(data?.pending) || 0,
    connected: true,
  };
}

export async function fetchPlaudInbox(all = false): Promise<PlaudNote[]> {
  try {
    const res = await fetch(`/api/plaud${all ? '?all=1' : ''}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const notes = Array.isArray(data?.notes) ? (data.notes as PlaudNote[]) : [];
    const cleaned = notes.map((n) => ({
      ...n,
      summary: unwrapPlaudText(n.summary),
      transcript: '',
    }));
    writeLocal(cleaned.filter((n) => n.status === 'pending'));
    return cleaned;
  } catch {
    return readLocal();
  }
}

export async function updatePlaudNoteStatus(
  id: string,
  status: PlaudNote['status'],
): Promise<PlaudNote | null> {
  try {
    const res = await fetch('/api/plaud', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const local = readLocal().filter((n) => n.id !== id);
    writeLocal(local);
    return (data?.note as PlaudNote) ?? null;
  } catch {
    writeLocal(readLocal().filter((n) => n.id !== id));
    return null;
  }
}

/** Create todos from Plaud action items (local). */
export function applyPlaudActionItemsToTodos(note: PlaudNote): number {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().slice(0, 10);
  let count = 0;
  for (const item of note.actionItems ?? []) {
    const title = item.trim();
    if (!title) continue;
    addManualTodo(`[Plaud] ${title}`, dueDate);
    count += 1;
  }
  if (!count && note.summary) {
    addManualTodo(`[Plaud] ${note.title}: nachverfolgen`, dueDate);
    count = 1;
  }
  return count;
}

const NAME_STOPWORDS = new Set([
  'gmbh', 'ag', 'kg', 'og', 'co', 'und', 'the', 'gmbhco', 'mbh', 'ohg', 'ug', 'se',
]);

function localYmd(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    if (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Recording day in the user's local timezone (YYYY-MM-DD). */
export function plaudVisitDate(note: PlaudNote): string {
  return localYmd(note.recordedAt || note.receivedAt);
}

export function formatPlaudProtocol(note: PlaudNote): { notes: string; keywords: string[] } {
  const title = note.title.trim() || 'Aufnahme';
  const parts: string[] = [`Gesprächsprotokoll (Plaud): ${title}`];
  const summary = unwrapPlaudText(note.summary).trim();
  if (summary) parts.push('', summary);
  const items = (note.actionItems ?? []).map((item) => item.trim()).filter(Boolean);
  if (items.length) {
    parts.push('', 'Nächste Schritte', ...items.map((item) => `• ${item}`));
  }
  parts.push('', `Plaud-ID: ${note.id}`);

  const keywords = ['Gesprächsprotokoll', 'Plaud'];
  if (title.length <= 40 && !/^plaud/i.test(title) && title !== 'Aufnahme') {
    keywords.push(title);
  }
  for (const item of items.slice(0, 2)) {
    const short = item.length > 32 ? `${item.slice(0, 32)}…` : item;
    if (short && !keywords.includes(short)) keywords.push(short);
  }
  return { notes: parts.join('\n'), keywords: keywords.slice(0, 6) };
}

export function suggestCustomersForPlaud(
  note: PlaudNote,
  customers: CustomerPriority[],
  limit = 5,
): CustomerPriority[] {
  const hay = normalizeSearch(`${note.title} ${note.summary}`);
  if (!hay) return [];
  return customers
    .map((customer) => {
      const name = normalizeSearch(customer.name);
      if (name.length < 3) return { customer, score: 0 };
      let score = 0;
      if (hay.includes(name)) score += 10;
      for (const token of name.split(' ')) {
        if (token.length < 4 || NAME_STOPWORDS.has(token)) continue;
        if (hay.includes(token)) score += 2;
      }
      return { customer, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.customer);
}

export interface ApplyPlaudVisitOptions {
  date: string;
  recordAsVisit?: boolean;
  applyTodos?: boolean;
}

export function applyPlaudToVisitReport(
  note: PlaudNote,
  customer: CustomerPriority,
  options: ApplyPlaudVisitOptions,
): VisitReport {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(options.date) ? options.date : plaudVisitDate(note);
  const protocol = formatPlaudProtocol(note);
  const details = getCustomerDetails(customer.id);
  const existing = details.visitReports ?? [];
  const marker = `Plaud-ID: ${note.id}`;
  const sameDay = existing.find((report) => report.date === date);
  let report: VisitReport;

  if (sameDay?.notes.includes(marker)) {
    report = sameDay;
  } else if (sameDay) {
    const mergedNotes = sameDay.notes.trim()
      ? `${sameDay.notes.trim()}\n\n---\n\n${protocol.notes}`
      : protocol.notes;
    const keywords = [...sameDay.keywords];
    for (const kw of protocol.keywords) {
      if (!keywords.includes(kw)) keywords.push(kw);
    }
    report = { ...sameDay, notes: mergedNotes, keywords: keywords.slice(0, 8), open: true };
  } else {
    report = {
      ...createEmptyVisitReport(date),
      keywords: protocol.keywords,
      notes: protocol.notes,
      open: true,
    };
  }

  const nextReports = sameDay
    ? existing.map((item) => (item.id === report.id ? report : item))
    : [report, ...existing];
  nextReports.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const next: CustomerDetails = { ...details, visitReports: nextReports };
  updateCustomerDetails(customer.id, next);

  if (options.recordAsVisit !== false) {
    const lastVisit = getVisitState(customer.id).lastVisit;
    if (!lastVisit || lastVisit <= date) {
      recordVisit(customer.id, resolveCadenceMonths(customer), dateFromYmd(date));
    }
  }

  if (options.applyTodos) applyPlaudActionItemsToTodos(note);
  return report;
}
