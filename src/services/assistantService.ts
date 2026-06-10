import type { AssistantContextPayload } from './assistantContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: string;
}

export interface AssistantAction {
  type: 'navigate' | 'open_tender' | 'send_daily_digest' | 'refresh_tenders';
  path?: string;
  tenderId?: string;
}

export interface AssistantResponse {
  reply: string;
  actions: AssistantAction[];
  mode: string;
}

const HISTORY_KEY = 'pht_assistant_history';

export function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(messages: ChatMessage[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
}

export function clearChatHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export async function sendAssistantMessage(
  userMessage: string,
  history: ChatMessage[],
  context: AssistantContextPayload,
): Promise<AssistantResponse> {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });

  if (!res.ok) {
    throw new Error(`Assistent nicht erreichbar (${res.status})`);
  }

  return res.json() as Promise<AssistantResponse>;
}

export const QUICK_PROMPTS = [
  { label: 'Tagesbriefing', prompt: 'Gib mir ein vollständiges Tagesbriefing für die Geschäftsführung.' },
  { label: 'Top 3 Prioritäten', prompt: 'Was sind heute meine Top 3 Prioritäten? Sei konkret mit Ausschreibungen.' },
  { label: 'Fristen diese Woche', prompt: 'Welche Deadlines sind diese Woche kritisch? Was soll ich tun?' },
  { label: 'Must-Win Deals', prompt: 'Welche Must-Win Deals brauchen sofort Aufmerksamkeit?' },
  { label: 'Marktführer-Status', prompt: 'Wie stehen wir beim 12-Monats Marktführer-Plan?' },
  { label: 'E-Mail Entwurf', prompt: 'Schreibe einen kurzen E-Mail-Entwurf an das Team mit den wichtigsten Ausschreibungen und Fristen dieser Woche.' },
] as const;
