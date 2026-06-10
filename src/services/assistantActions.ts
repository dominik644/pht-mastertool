import type { NavigateFunction } from 'react-router-dom';
import type { AssistantAction } from './assistantService';
import { sendDailyDigest } from './digestService';
import type { Tender } from '../types/tender';

export async function executeAssistantActions(
  actions: AssistantAction[],
  deps: {
    navigate: NavigateFunction;
    openTender: (id: string) => void;
    refreshTenders: () => Promise<void>;
    allTenders: Tender[];
  },
): Promise<string[]> {
  const results: string[] = [];

  for (const action of actions) {
    switch (action.type) {
      case 'navigate':
        if (action.path) {
          deps.navigate(action.path);
          results.push(`Geöffnet: ${action.path}`);
        }
        break;
      case 'open_tender':
        if (action.tenderId) {
          deps.openTender(action.tenderId);
          deps.navigate(`/tenders/${action.tenderId}`);
          results.push('Ausschreibung geöffnet');
        }
        break;
      case 'send_daily_digest': {
        const r = await sendDailyDigest(deps.allTenders);
        results.push(r.message);
        break;
      }
      case 'refresh_tenders':
        await deps.refreshTenders();
        results.push('Neue Ausschreibungssuche gestartet');
        break;
      default:
        break;
    }
  }

  return results;
}
