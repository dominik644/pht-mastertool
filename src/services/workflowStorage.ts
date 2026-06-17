import type { WorkflowHistoryEntry } from '../types/workflow';
import { isStartupStorageBlocked } from '../lib/startupFlags';

const HISTORY_KEY = 'pht-mastertool-workflow-history';

export function loadWorkflowHistory(): WorkflowHistoryEntry[] {
  if (isStartupStorageBlocked()) return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as WorkflowHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWorkflowHistory(history: WorkflowHistoryEntry[]): void {
  if (isStartupStorageBlocked()) return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
}
