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

export async function createCalendarEvent(params: {
  subject: string;
  body: string;
  start: string;
  end: string;
  url?: string;
  attendeeEmail?: string;
}): Promise<{ id: string }> {
  const attendees = params.attendeeEmail
    ? [{ emailAddress: { address: params.attendeeEmail, name: params.attendeeEmail }, type: 'required' }]
    : undefined;

  const res = await graphFetch('/me/events', {
    method: 'POST',
    body: JSON.stringify({
      subject: params.subject,
      body: { contentType: 'HTML', content: params.body.replace(/\n/g, '<br>') },
      start: { dateTime: params.start, timeZone: 'Europe/Berlin' },
      end: { dateTime: params.end, timeZone: 'Europe/Berlin' },
      location: params.url ? { displayName: 'Ausschreibung' } : undefined,
      attendees,
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

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const res = await graphFetch('/me/sendMail', {
    method: 'POST',
    body: JSON.stringify({
      message: {
        subject: params.subject,
        body: { contentType: 'Text', content: params.body },
        toRecipients: [{ emailAddress: { address: params.to } }],
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`E-Mail: ${res.status} – ${err.slice(0, 120)}`);
  }
}
