import { differenceInDays, parseISO } from 'date-fns';
import type { Tender } from '../types/tender';

export interface PowerAction {
  id: string;
  tenderId: string;
  title: string;
  country: string;
  deadline: string;
  daysLeft: number;
  score: number;
  winPriority: number;
  revenue: string;
  action: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export function computeWinPriority(t: Tender): number {
  const days = differenceInDays(parseISO(t.deadline), new Date());
  const deadlineBoost = days <= 3 ? 30 : days <= 7 ? 20 : days <= 14 ? 12 : days <= 30 ? 6 : 0;
  const budgetBoost = t.estimatedValue >= 500000 ? 25 : t.estimatedValue >= 100000 ? 15 : t.estimatedValue >= 50000 ? 8 : 0;
  const profileBoost = (t.productMatch.profiles?.[0]?.score ?? 0) * 2;
  const watchBoost = t.watchlist ? 10 : 0;
  const workflowBoost = t.status !== 'Neu' && t.status !== 'Verloren' ? 5 : 0;
  const cpvBoost = (t.cpvCodes?.length ?? 0) > 0 ? 5 : 0;
  return Math.min(100, Math.round(t.score * 0.5 + deadlineBoost + budgetBoost + profileBoost + watchBoost + workflowBoost + cpvBoost));
}

export function buildPowerActions(tenders: Tender[]): PowerAction[] {
  return tenders
    .filter((t) => t.scoreRecommendation !== 'NO-GO')
    .map((t) => {
      const daysLeft = differenceInDays(parseISO(t.deadline), new Date());
      const winPriority = computeWinPriority(t);
      let action = 'Erstbewertung';
      if (t.status === 'Prüfen' || t.status === 'Technik prüfen') action = 'Technik & Machbarkeit klären';
      else if (t.status === 'Angebot vorbereiten') action = 'Angebot finalisieren';
      else if (t.status === 'Abgegeben') action = 'Nachfassen beim Kunden';
      else if (t.score >= 70 && t.category === 'C') action = 'Sofort GO – Angebot vorbereiten';
      else if (daysLeft <= 7) action = 'Dringend: Frist prüfen & entscheiden';

      const urgency: PowerAction['urgency'] =
        daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'high' : winPriority >= 75 ? 'high' : winPriority >= 50 ? 'medium' : 'low';

      return {
        id: `action-${t.id}`,
        tenderId: t.id,
        title: t.title,
        country: t.country,
        deadline: t.deadline,
        daysLeft,
        score: t.score,
        winPriority,
        revenue: t.revenuePotential,
        action,
        urgency,
      };
    })
    .sort((a, b) => b.winPriority - a.winPriority);
}

export function shouldAutoWatchlist(t: Tender): boolean {
  return t.scoreRecommendation === 'GO' && t.score >= 70 && !t.watchlist;
}
