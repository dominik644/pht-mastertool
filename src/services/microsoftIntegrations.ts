import type { Tender } from '../types/tender';

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

export function createOutlookEvent(tender: Tender): { success: boolean; message: string } {
  try {
    const deadline = tender.deadline;
    const start = `${deadline}T09:00:00`;
    const end = `${deadline}T10:00:00`;
    const subject = encodeURIComponent(`Angebotsfrist: ${tender.title.slice(0, 80)}`);
    const body = encodeURIComponent(
      `PHT Ausschreibung\n\nTitel: ${tender.title}\nLand: ${tender.country}\nBudget: ${tender.revenuePotential}\nScore: ${tender.score}/100\n\nLink: ${tender.sourceUrl}\n\n${tender.nextStep}`,
    );

    const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${subject}&startdt=${start}&enddt=${end}&body=${body}`;
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');

    downloadIcsFile(tender, start, end);

    return {
      success: true,
      message: 'Outlook-Kalender wird geöffnet. Falls nicht angemeldet, bitte bei Microsoft anmelden – ICS-Datei wurde zusätzlich heruntergeladen.',
    };
  } catch {
    return {
      success: false,
      message: 'Termin konnte nicht erstellt werden. Bitte bei Outlook anmelden und erneut versuchen.',
    };
  }
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

export function createMicrosoftTodoTasks(tender: Tender): { success: boolean; message: string; tasks: TodoTask[] } {
  const tasks = buildTodoTasks(tender);
  const text = tasks.map((t, i) => `${i + 1}. ${t.title}\n   Fällig: ${t.dueDate}\n   ${t.notes}`).join('\n\n');

  navigator.clipboard?.writeText(text).catch(() => {});

  const todoUrl = 'https://to-do.office.com/tasks/inbox';
  window.open(todoUrl, '_blank', 'noopener,noreferrer');

  return {
    success: true,
    tasks,
    message:
      'Microsoft To Do wird geöffnet. Aufgaben wurden in die Zwischenablage kopiert – bitte bei Microsoft anmelden und Tasks manuell einfügen (Graph API erforderlich für Auto-Import).',
  };
}
