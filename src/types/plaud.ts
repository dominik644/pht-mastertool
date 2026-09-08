export interface PlaudNote {
  id: string;
  title: string;
  transcript: string;
  summary: string;
  actionItems: string[];
  recordedAt: string;
  receivedAt: string;
  status: 'pending' | 'applied' | 'dismissed';
}
