import type { Tender } from '../types/tender';
import { getTargetEmail } from './integrationSettings';
import {
  downloadIcs,
  mailtoBulkDeadlines,
  mailtoCalendarInvite,
  mailtoTodoList,
  openGoogleCalendar,
  openOutlookCompose,
} from './calendarIntegrations';
import { isMicrosoftConfigured } from './microsoftAuth';
import { createCalendarEvent, createTodoTask, getDefaultTodoListId, sendEmail } from './microsoftGraph';

export interface TodoTask {
  title: string;
  dueDate: string;
  notes: string;
}

const TODO_TEMPLATES = [
  'Erstbewertung durchführen',
  'Produktauswahl (PHT-Matching)',
  'Angebotskalkulation',
  'Angebot abgeben',
  'Nachfassen beim Kunden',
];

export function buildTodoTasks(tender: Tender): TodoTask[] {
  const deadline = tender.deadline;
  const base = new Date(deadline);
  const offsets = [21, 14, 7, 1, -7];

  return TODO_TEMPLATES.map((title, i) => {
    const due = new Date(base);
    due.setDate(due.getDate() - offsets[i]);
    return {
      title: `${title}: ${tender.title.slice(0, 50)}`,
      dueDate: due.toISOString().slice(0, 10),
      notes: `Ausschreibung: ${tender.title}\nDeadline: ${tender.deadline}\nLink: ${tender.sourceUrl}\nScore: ${tender.score}/100`,
    };
  });
}

function resolveEmail(override?: string): string {
  return override?.trim() || getTargetEmail();
}

export async function createOutlookEvent(
  tender: Tender,
  targetEmail?: string,
): Promise<{ success: boolean; message: string }> {
  const email = resolveEmail(targetEmail);
  const deadline = tender.deadline;
  const start = `${deadline}T09:00:00`;
  const end = `${deadline}T10:00:00`;
  const subject = `Angebotsfrist: ${tender.title.slice(0, 80)}`;
  const body = `PHT Ausschreibung\n\nTitel: ${tender.title}\nLand: ${tender.country}\nBudget: ${tender.revenuePotential}\nScore: ${tender.score}/100\n\nLink: ${tender.sourceUrl}\n\n${tender.nextStep}`;

  if (isMicrosoftConfigured()) {
    try {
      await createCalendarEvent({ subject, body, start, end, url: tender.sourceUrl, attendeeEmail: email });
      return { success: true, message: `Kalendereinladung erstellt für ${email}.` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Graph API Fehler';
      if (!msg.includes('Nicht bei Microsoft')) {
        return { success: false, message: `${msg} – Universal-Fallback wird geöffnet.` };
      }
    }
  }

  try {
    openOutlookCompose(tender, start, end);
    openGoogleCalendar(tender, start, end);
    downloadIcs(tender, start, end, email);
    return {
      success: true,
      message: `Outlook, Google Kalender & ICS für ${email}. ICS importieren oder „An E-Mail senden“ nutzen.`,
    };
  } catch {
    return { success: false, message: 'Termin konnte nicht erstellt werden.' };
  }
}

export async function sendCalendarToEmail(
  tender: Tender,
  targetEmail?: string,
): Promise<{ success: boolean; message: string }> {
  const email = resolveEmail(targetEmail);
  const start = `${tender.deadline}T09:00:00`;
  const end = `${tender.deadline}T10:00:00`;
  const subject = `PHT Kalender: ${tender.title.slice(0, 60)}`;
  const body = `Angebotsfrist: ${tender.title}\nDatum: ${tender.deadline}\nLink: ${tender.sourceUrl}`;

  if (isMicrosoftConfigured()) {
    try {
      await sendEmail({ to: email, subject, body });
      downloadIcs(tender, start, end, email);
      return { success: true, message: `Kalender-Info per E-Mail an ${email} gesendet (+ ICS Download).` };
    } catch {
      /* fallback */
    }
  }

  mailtoCalendarInvite(tender, email, start, end);
  return { success: true, message: `E-Mail-Programm geöffnet für ${email} mit ICS-Anhang-Hinweis.` };
}

export async function createMicrosoftTodoTasks(
  tender: Tender,
  targetEmail?: string,
): Promise<{ success: boolean; message: string; tasks: TodoTask[] }> {
  const email = resolveEmail(targetEmail);
  const tasks = buildTodoTasks(tender);

  if (isMicrosoftConfigured()) {
    try {
      const listId = await getDefaultTodoListId();
      for (const task of tasks) {
        await createTodoTask(listId, task);
      }
      return { success: true, tasks, message: `${tasks.length} Aufgaben in Microsoft To Do (${email}) erstellt.` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Graph API Fehler';
      if (!msg.includes('Nicht bei Microsoft')) {
        return { success: false, message: `${msg} – Fallback wird geöffnet.`, tasks };
      }
    }
  }

  const text = tasks.map((t, i) => `${i + 1}. ${t.title}\n   Fällig: ${t.dueDate}\n   ${t.notes}`).join('\n\n');
  navigator.clipboard?.writeText(text).catch(() => {});

  if (isMicrosoftConfigured()) {
    try {
      await sendEmail({
        to: email,
        subject: `PHT To Do: ${tender.title.slice(0, 50)}`,
        body: `Aufgaben für Ausschreibung:\n\n${text}`,
      });
      return { success: true, tasks, message: `${tasks.length} Aufgaben per E-Mail an ${email} gesendet.` };
    } catch {
      /* fallback */
    }
  }

  mailtoTodoList(email, tasks, `PHT To Do: ${tender.title.slice(0, 40)}`);
  window.open('https://to-do.office.com/tasks/inbox', '_blank', 'noopener,noreferrer');

  return {
    success: true,
    tasks,
    message: `To-Do-Liste an ${email} (E-Mail-Programm) – auch in Zwischenablage.`,
  };
}

export async function sendTodosToEmail(
  tasks: TodoTask[],
  targetEmail?: string,
  title = 'PHT To Do Liste',
): Promise<{ success: boolean; message: string }> {
  const email = resolveEmail(targetEmail);
  const body = tasks.map((t, i) => `${i + 1}. ${t.title} (${t.dueDate})\n${t.notes}`).join('\n\n');

  if (isMicrosoftConfigured()) {
    try {
      await sendEmail({ to: email, subject: title, body });
      return { success: true, message: `${tasks.length} Aufgaben per E-Mail an ${email} gesendet.` };
    } catch {
      /* fallback */
    }
  }

  mailtoTodoList(email, tasks, title);
  return { success: true, message: `E-Mail-Programm geöffnet – Aufgaben an ${email}.` };
}

export async function bulkCalendarForTenders(
  tenders: Tender[],
  targetEmail?: string,
): Promise<{ success: boolean; message: string }> {
  const email = resolveEmail(targetEmail);
  if (tenders.length === 0) return { success: false, message: 'Keine Ausschreibungen ausgewählt.' };

  if (isMicrosoftConfigured() && tenders.length <= 8) {
    let created = 0;
    for (const t of tenders) {
      try {
        const start = `${t.deadline}T09:00:00`;
        const end = `${t.deadline}T10:00:00`;
        await createCalendarEvent({
          subject: `Angebotsfrist: ${t.title.slice(0, 80)}`,
          body: `PHT\n${t.title}\n${t.sourceUrl}`,
          start,
          end,
          url: t.sourceUrl,
          attendeeEmail: email,
        });
        created++;
      } catch {
        /* next */
      }
    }
    if (created > 0) {
      return { success: true, message: `${created} Kalendereinladungen für ${email} erstellt.` };
    }
  }

  mailtoBulkDeadlines(email, tenders);
  if (tenders.length <= 3) {
    for (const t of tenders) {
      const start = `${t.deadline}T09:00:00`;
      const end = `${t.deadline}T10:00:00`;
      downloadIcs(t, start, end, email);
    }
  }
  return { success: true, message: `Fristen (${tenders.length}) an ${email} – E-Mail + ICS.` };
}

export async function bulkTodosForTenders(
  tenders: Tender[],
  targetEmail?: string,
): Promise<{ success: boolean; message: string }> {
  if (tenders.length === 0) return { success: false, message: 'Keine Ausschreibungen ausgewählt.' };
  const tasks = tenders.flatMap((t) => buildTodoTasks(t));
  const title = `PHT Command Center – ${tenders.length} Deals, ${tasks.length} Aufgaben`;
  return sendTodosToEmail(tasks, targetEmail, title);
}

export async function sendSummaryEmail(
  subject: string,
  body: string,
  targetEmail?: string,
): Promise<{ success: boolean; message: string }> {
  const email = resolveEmail(targetEmail);

  if (isMicrosoftConfigured()) {
    try {
      await sendEmail({ to: email, subject, body });
      return { success: true, message: `Zusammenfassung an ${email} gesendet.` };
    } catch {
      /* fallback */
    }
  }

  const encSubject = encodeURIComponent(subject);
  const encBody = encodeURIComponent(body);
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encSubject}&body=${encBody}`;
  return { success: true, message: `E-Mail-Programm für ${email} geöffnet.` };
}
