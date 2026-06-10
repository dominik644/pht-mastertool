import type { PipelineStatus } from './tender';

export interface WorkflowHistoryEntry {
  id: string;
  tenderId: string;
  tenderTitle: string;
  fromStatus: PipelineStatus | null;
  toStatus: PipelineStatus;
  timestamp: string;
  note?: string;
}
