import type { Milestone, Tender } from '../types/tender';

export const DEFAULT_MILESTONE_TITLES = [
  'Erstbewertung',
  'Produktauswahl',
  'Angebotskalkulation',
  'Interne Freigabe',
  'Angebotsabgabe',
  'Nachfassen / Follow-up',
];

export function buildDefaultMilestones(deadline: string): Milestone[] {
  const dl = new Date(deadline);
  const offsets = [21, 14, 10, 7, 3, -7];
  const types = ['review', 'product', 'quote', 'approval', 'submission', 'followup'];

  return DEFAULT_MILESTONE_TITLES.map((title, i) => {
    const due = new Date(dl);
    due.setDate(due.getDate() - offsets[i]!);
    return {
      id: `ms-${i + 1}`,
      title,
      dueDate: due.toISOString().slice(0, 10),
      type: types[i]!,
      completed: false,
    };
  });
}

export function ensureMilestones(tender: Tender): Milestone[] {
  if (tender.milestones?.length) return tender.milestones;
  return buildDefaultMilestones(tender.deadline || tender.submissionDeadline);
}
