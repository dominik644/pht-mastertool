export interface AppTodo {
  id: string;
  title: string;
  dueDate: string;
  tenderId?: string;
  tenderTitle?: string;
  completed: boolean;
  source: 'manual' | 'tender' | 'milestone';
}

const STORAGE_KEY = 'pht-mastertool-todos';

function isManualTodo(todo: AppTodo): boolean {
  return todo.source === 'manual' && !todo.tenderId && !todo.id.startsWith('tender-') && !todo.id.startsWith('ms-');
}

export function loadTodos(): AppTodo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AppTodo[]) : [];
    return Array.isArray(parsed) ? parsed.filter(isManualTodo) : [];
  } catch {
    return [];
  }
}

export function saveTodos(todos: AppTodo[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

export function toggleTodo(id: string): AppTodo[] {
  const todos = loadTodos().map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  saveTodos(todos);
  return todos;
}

export function addManualTodo(title: string, dueDate: string): AppTodo[] {
  const todos = [
    ...loadTodos(),
    { id: `manual-${Date.now()}`, title, dueDate, completed: false, source: 'manual' as const },
  ];
  saveTodos(todos);
  return todos;
}

export function removeTodo(id: string): AppTodo[] {
  const todos = loadTodos().filter((t) => t.id !== id);
  saveTodos(todos);
  return todos;
}
