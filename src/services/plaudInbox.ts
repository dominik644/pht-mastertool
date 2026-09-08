import type { PlaudNote } from '../types/plaud';
import { addManualTodo } from './todoStorage';

const LOCAL_INBOX_KEY = 'pht-plaud-inbox';

function readLocal(): PlaudNote[] {
  try {
    const raw = localStorage.getItem(LOCAL_INBOX_KEY);
    return raw ? (JSON.parse(raw) as PlaudNote[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(notes: PlaudNote[]) {
  localStorage.setItem(LOCAL_INBOX_KEY, JSON.stringify(notes));
}

export async function fetchPlaudInbox(all = false): Promise<PlaudNote[]> {
  try {
    const res = await fetch(`/api/plaud${all ? '?all=1' : ''}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const notes = Array.isArray(data?.notes) ? (data.notes as PlaudNote[]) : [];
    writeLocal(notes.filter((n) => n.status === 'pending'));
    return notes;
  } catch {
    return readLocal();
  }
}

export async function updatePlaudNoteStatus(
  id: string,
  status: PlaudNote['status'],
): Promise<PlaudNote | null> {
  try {
    const res = await fetch('/api/plaud', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const local = readLocal().filter((n) => n.id !== id);
    writeLocal(local);
    return (data?.note as PlaudNote) ?? null;
  } catch {
    writeLocal(readLocal().filter((n) => n.id !== id));
    return null;
  }
}

/** Create todos from Plaud action items (local). */
export function applyPlaudActionItemsToTodos(note: PlaudNote): number {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().slice(0, 10);
  let count = 0;
  for (const item of note.actionItems ?? []) {
    const title = item.trim();
    if (!title) continue;
    addManualTodo(`[Plaud] ${title}`, dueDate);
    count += 1;
  }
  if (!count && note.summary) {
    addManualTodo(`[Plaud] ${note.title}: nachverfolgen`, dueDate);
    count = 1;
  }
  return count;
}
