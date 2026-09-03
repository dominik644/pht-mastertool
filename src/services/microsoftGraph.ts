import { GRAPH_BASE } from '../config/microsoft';
import { acquireGraphToken } from './microsoftAuth';

async function graphFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await acquireGraphToken();
  if (!token) throw new Error('Nicht bei Microsoft angemeldet');

  return fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function getCalendarBusyTimes(
  startIso: string,
  endIso: string,
): Promise<Array<{ start: string; end: string; label?: string }>> {
  const params = new URLSearchParams({
    startDateTime: startIso,
    endDateTime: endIso,
    $select: 'start,end,showAs,subject',
    $top: '250',
  });

  const res = await graphFetch(`/me/calendarView?${params}`, {
    headers: { Prefer: 'outlook.timezone="Europe/Berlin"' },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kalender: ${res.status} – ${err.slice(0, 120)}`);
  }

  const data = await res.json();
  return (data.value ?? [])
    .filter((e: { showAs?: string }) => e.showAs !== 'free')
    .map((e: { start?: { dateTime?: string }; end?: { dateTime?: string }; subject?: string }) => ({
      start: normalizeGraphDateTime(e.start?.dateTime),
      end: normalizeGraphDateTime(e.end?.dateTime),
      label: e.subject?.trim() || undefined,
    }))
    .filter((e: { start: string; end: string }) => e.start && e.end);
}

function normalizeGraphDateTime(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/\.\d+$/, '').replace(/Z$/, '');
}

export async function createCalendarEvent(params: {
  subject: string;
  body: string;
  start: string;
  end: string;
  url?: string;
  attendeeEmail?: string;
  attendeeEmails?: string[];
  location?: string;
}): Promise<{ id: string }> {
  const emails = params.attendeeEmails?.length
    ? params.attendeeEmails
    : params.attendeeEmail
      ? [params.attendeeEmail]
      : [];
  const attendees = emails.map((email) => ({
    emailAddress: { address: email, name: email },
    type: 'required',
  }));

  const res = await graphFetch('/me/events', {
    method: 'POST',
    body: JSON.stringify({
      subject: params.subject,
      body: { contentType: 'HTML', content: params.body.replace(/\n/g, '<br>') },
      start: { dateTime: params.start, timeZone: 'Europe/Berlin' },
      end: { dateTime: params.end, timeZone: 'Europe/Berlin' },
      location: params.location
        ? { displayName: params.location }
        : params.url
          ? { displayName: 'Ausschreibung' }
          : undefined,
      attendees: attendees.length ? attendees : undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kalender: ${res.status} – ${err.slice(0, 120)}`);
  }
  return res.json();
}

export async function getDefaultTodoListId(): Promise<string> {
  const res = await graphFetch('/me/todo/lists');
  if (!res.ok) throw new Error(`To Do Listen: ${res.status}`);
  const data = await res.json();
  const list = data.value?.find((l: { wellknownListName?: string }) => l.wellknownListName === 'defaultList')
    ?? data.value?.[0];
  if (!list?.id) throw new Error('Keine To-Do-Liste gefunden');
  return list.id;
}

export async function createTodoTask(listId: string, task: {
  title: string;
  dueDate: string;
  notes: string;
}): Promise<void> {
  const res = await graphFetch(`/me/todo/lists/${listId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({
      title: task.title,
      body: { content: task.notes, contentType: 'text' },
      dueDateTime: { dateTime: `${task.dueDate}T09:00:00`, timeZone: 'Europe/Berlin' },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`To Do: ${res.status} – ${err.slice(0, 120)}`);
  }
}

export interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string;
}

function buildGraphMessage(params: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
}): Record<string, unknown> {
  const message: Record<string, unknown> = {
    subject: params.subject,
    body: {
      contentType: params.html ? 'HTML' : 'Text',
      content: params.html ?? params.body,
    },
    toRecipients: [{ emailAddress: { address: params.to } }],
  };

  if (params.attachments?.length) {
    message.attachments = params.attachments.map((attachment) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: attachment.name,
      contentType: attachment.contentType,
      contentBytes: attachment.contentBytes,
    }));
  }

  return message;
}

/** Encode Graph message id for Outlook compose deeplink. */
export function encodeOutlookItemId(messageId: string): string {
  return encodeURIComponent(messageId).replace(/-/g, '%2F').replace(/_/g, '%2B');
}

/** Open a Graph draft in Outlook (web compose; desktop when configured). */
export function openOutlookDraftCompose(messageId: string): void {
  const encoded = encodeOutlookItemId(messageId);
  window.open(`https://outlook.office.com/mail/deeplink/compose/${encoded}`, '_blank', 'noopener,noreferrer');
}

export async function createDraftEmail(params: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
}): Promise<{ id: string; webLink?: string }> {
  const res = await graphFetch('/me/messages', {
    method: 'POST',
    body: JSON.stringify(buildGraphMessage(params)),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Entwurf: ${res.status} – ${err.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!data?.id) throw new Error('Entwurf konnte nicht erstellt werden');
  return { id: data.id, webLink: data.webLink };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  const res = await graphFetch('/me/sendMail', {
    method: 'POST',
    body: JSON.stringify({
      message: buildGraphMessage(params),
      saveToSentItems: true,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`E-Mail: ${res.status} – ${err.slice(0, 120)}`);
  }
}
