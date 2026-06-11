import { CheckSquare, Mail, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMicrosoftAuth } from '../context/MicrosoftAuthContext';
import { useTenders } from '../context/TenderContext';
import { buildTodoTasks, sendTodosToEmail } from '../services/microsoftIntegrations';
import {
  addManualTodo, loadTodos, removeTodo, saveTodos, toggleTodo, type AppTodo,
} from '../services/todoStorage';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

function todosFromTenders(watchlistIds: Set<string>, allTenders: ReturnType<typeof useTenders>['allTenders']): AppTodo[] {
  const items: AppTodo[] = [];
  for (const t of allTenders) {
    if (!watchlistIds.has(t.id) && t.score < 60) continue;
    for (const task of buildTodoTasks(t)) {
      items.push({
        id: `tender-${t.id}-${task.title.slice(0, 20)}`,
        title: task.title,
        dueDate: task.dueDate,
        tenderId: t.id,
        tenderTitle: t.title,
        completed: false,
        source: 'tender',
      });
    }
    for (const m of t.milestones ?? []) {
      items.push({
        id: `ms-${t.id}-${m.id}`,
        title: m.title,
        dueDate: m.dueDate || t.deadline,
        tenderId: t.id,
        tenderTitle: t.title,
        completed: m.completed,
        source: 'milestone',
      });
    }
  }
  return items;
}

export function TodoMobile() {
  const { allTenders, openTender } = useTenders();
  const { targetEmail } = useMicrosoftAuth();
  const [stored, setStored] = useState<AppTodo[]>(() => loadTodos());
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [showDone, setShowDone] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const watchlistIds = useMemo(() => new Set(allTenders.filter((t) => t.watchlist).map((t) => t.id)), [allTenders]);
  const generated = useMemo(() => todosFromTenders(watchlistIds, allTenders), [watchlistIds, allTenders]);

  const merged = useMemo(() => {
    const storedIds = new Set(stored.map((t) => t.id));
    const fromGen = generated.filter((g) => !storedIds.has(g.id));
    return [...stored, ...fromGen].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [stored, generated]);

  const visible = merged.filter((t) => showDone || !t.completed);
  const openCount = merged.filter((t) => !t.completed).length;

  const handleToggle = useCallback((id: string) => {
    if (id.startsWith('tender-') || id.startsWith('ms-')) {
      setStored((prev) => {
        const existing = prev.find((t) => t.id === id);
        const next = existing
          ? prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
          : [...prev, { ...merged.find((t) => t.id === id)!, completed: true }];
        saveTodos(next);
        return next;
      });
      return;
    }
    setStored(toggleTodo(id));
  }, [merged]);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setStored(addManualTodo(newTitle.trim(), newDate));
    setNewTitle('');
    setAddOpen(false);
  };

  useEffect(() => {
    saveTodos(stored);
  }, [stored]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-pht-400" />
            To Do
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Watchlist & Top-Chancen</p>
        </div>
        <Badge variant="muted">{openCount} offen</Badge>
      </header>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pht-600 text-white text-sm font-medium min-h-[44px]"
        >
          <Plus className="w-4 h-4" /> Neue Aufgabe
        </button>
        <button
          type="button"
          disabled={openCount === 0}
          onClick={async () => {
            const tasks = visible
              .filter((t) => !t.completed)
              .map((t) => ({
                title: t.title,
                dueDate: t.dueDate,
                notes: t.tenderTitle ? `Ausschreibung: ${t.tenderTitle}` : 'Manuelle Aufgabe',
              }));
            const r = await sendTodosToEmail(tasks, targetEmail, `PHT To Do (${tasks.length} Aufgaben)`);
            setEmailMsg(r.message);
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-sky-500/30 text-xs text-sky-300 min-h-[44px] disabled:opacity-40"
        >
          <Mail className="w-4 h-4" />
        </button>
      </div>
      {emailMsg && <p className="text-xs text-slate-500">{emailMsg}</p>}

      {addOpen && (
        <Card>
          <CardContent className="py-4">
            <form onSubmit={handleAdd} className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Neue Aufgabe…"
                className="w-full px-3 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-sm text-white min-h-[44px]"
              />
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-sm text-white min-h-[44px]"
              />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-pht-600 text-white text-sm font-medium min-h-[44px]">
                Hinzufügen
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <label className="flex items-center gap-2 text-xs text-slate-400 min-h-[44px]">
        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="rounded w-4 h-4" />
        Erledigte anzeigen
      </label>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">Keine offenen Aufgaben.</p>
        ) : (
          visible.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border border-dark-500/50 min-h-[64px] ${
                task.completed ? 'opacity-50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task.id)}
                className="mt-1 rounded w-5 h-5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-white ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">Fällig: {task.dueDate}</p>
                {task.tenderId && (
                  <button
                    type="button"
                    onClick={() => openTender(task.tenderId!)}
                    className="text-xs text-pht-400 mt-1 line-clamp-1 text-left min-h-[32px]"
                  >
                    {task.tenderTitle?.slice(0, 50) ?? 'Ausschreibung öffnen'}
                  </button>
                )}
              </div>
              {task.source === 'manual' && (
                <button
                  type="button"
                  onClick={() => setStored(removeTodo(task.id))}
                  className="p-2 text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
