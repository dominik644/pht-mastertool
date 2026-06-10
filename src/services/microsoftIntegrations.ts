import type { Tender } from '../types/tender';
import { MS_DEFAULT_USER } from '../config/microsoft';
import { isMicrosoftConfigured } from './microsoftAuth';
import { createCalendarEvent, createTodoTask, getDefaultTodoListId } from './microsoftGraph';

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

function outlookDeeplink(tender: Tender, start: string, end: string): string {
  const subject = encodeURIComponent(`Angebotsfrist: ${tender.title.slice(0, 80)}`);
  const body = encodeURIComponent(
    `PHT Ausschreibung (${MS_DEFAULT_USER})\n\nTitel: ${tender.title}\nLand: ${tender.country}\nBudget: ${tender.revenuePotential}\nScore: ${tender.score}/100\n\nLink: ${tender.sourceUrl}\n\n${tender.nextStep}`,
  );
  return `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${subject}&startdt=${start}&enddt=${end}&body=${body}`;
}

function downloadIcsFile(tender: Tender, start: string, end: string) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PHT Mastertool//DE',
    'BEGIN:VEVENT',
    `UID:${tender.id}@pht-mastertool`,
    `DTSTART:${start.replace(/[-:]/g, '').slice(0, 15)}`,
    `DTEND:${end.replace(/[-:]/g, '').slice(0, 15)}`,
    `SUMMARY:Angebotsfrist: ${tender.title.replace(/[,;\\]/g, '')}`,
    `DESCRIPTION:${tender.sourceUrl}`,
    `URL:${tender.sourceUrl}`,
    `ORGANIZER:mailto:${MS_DEFAULT_USER}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pht-deadline-${tender.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function createOutlookEvent(tender: Tender): Promise<{ success: boolean; message: string }> {
  const deadline = tender.deadline;
  const start = `${deadline}T09:00:00`;
  const end = `${deadline}T10:00:00`;
  const subject = `Angebotsfrist: ${tender.title.slice(0, 80)}`;
  const body = `PHT Ausschreibung\n\nTitel: ${tender.title}\nLand: ${tender.country}\nBudget: ${tender.revenuePotential}\nScore: ${tender.score}/100\n\nLink: ${tender.sourceUrl}\n\n${tender.nextStep}`;

  if (isMicrosoftConfigured()) {
    try {
      await createCalendarEvent({ subject, body, start, end, url: tender.sourceUrl });
      return {
        success: true,
        message: `Kalendereintrag in Outlook (${MS_DEFAULT_USER}) erstellt.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Graph API Fehler';
      if (!msg.includes('Nicht bei Microsoft')) {
        return { success: false, message: `${msg} – Fallback wird geöffnet.` };
      }
    }
  }

  try {
    window.open(outlookDeeplink(tender, start, end), '_blank', 'noopener,noreferrer');
    downloadIcsFile(tender, start, end);
    return {
      success: true,
      message: `Outlook geöffnet für ${MS_DEFAULT_USER}. ICS-Datei heruntergeladen. Für Auto-Sync: Azure App in .env.local konfigurieren und anmelden.`,
    };
  } catch {
    return { success: false, message: 'Termin konnte nicht erstellt werden.' };
  }
}

export async function createMicrosoftTodoTasks(tender: Tender): Promise<{ success: boolean; message: string; tasks: TodoTask[] }> {
  const tasks = buildTodoTasks(tender);

  if (isMicrosoftConfigured()) {
    try {
      const listId = await getDefaultTodoListId();
      for (const task of tasks) {
        await createTodoTask(listId, task);
      }
      return {
        success: true,
        tasks,
        message: `${tasks.length} Aufgaben in Microsoft To Do (${MS_DEFAULT_USER}) erstellt.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Graph API Fehler';
      if (!msg.includes('Nicht bei Microsoft')) {
        return { success: false, message: `${msg} – Fallback wird geöffnet.`, tasks };
      }
    }
  }

  const text = tasks.map((t, i) => `${i + 1}. ${t.title}\n   Fällig: ${t.dueDate}\n   ${t.notes}`).join('\n\n');
  navigator.clipboard?.writeText(text).catch(() => {});
  window.open('https://to-do.office.com/tasks/inbox', '_blank', 'noopener,noreferrer');

  return {
    success: true,
    tasks,
    message: `To Do geöffnet – Aufgaben in Zwischenablage. Für ${MS_DEFAULT_USER}: anmelden und Azure App konfigurieren.`,
  };
}
