import { CheckSquare, Mail, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { TodoMobile } from '../components/TodoMobile';
import { useViewMode } from '../context/ViewModeContext';
import { useMicrosoftAuth } from '../context/MicrosoftAuthContext';
import { useTenders } from '../context/TenderContext';
import { buildTodoTasks, sendTodosToEmail } from '../services/microsoftIntegrations';
import {
  addManualTodo, loadTodos, removeTodo, saveTodos, toggleTodo, type AppTodo,
} from '../services/todoStorage';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

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

export function TodoPage() {
  const { isMobileView } = useViewMode();
  if (isMobileView) return <TodoMobile />;

  const { allTenders, openTender } = useTenders();
  const { targetEmail } = useMicrosoftAuth();
  const [stored, setStored] = useState<AppTodo[]>(() => loadTodos());
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [showDone, setShowDone] = useState(false);

  const watchlistIds = useMemo(() => new Set(allTenders.filter((t) => t.watchlist).map((t) => t.id)), [allTenders]);

  const generated = useMemo(
    () => todosFromTenders(watchlistIds, allTenders),
    [watchlistIds, allTenders],
  );

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
  };

  useEffect(() => {
    saveTodos(stored);
  }, [stored]);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-pht-400" />
            To Do
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Aufgaben aus Watchlist, Top-Chancen (Score ≥ 60) und eigene Einträge
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="muted">{openCount} offen</Badge>
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/30 text-xs text-sky-300 hover:bg-sky-500/10 disabled:opacity-40"
          >
            <Mail className="w-3.5 h-3.5" /> An {targetEmail}
          </button>
        </div>
      </header>
      {emailMsg && <p className="text-xs text-slate-500 -mt-4 mb-4">{emailMsg}</p>}

      <Card className="mb-6">
        <CardContent className="py-4">
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Neue Aufgabe…"
              className="flex-1 px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white placeholder:text-slate-600"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white"
            />
            <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700">
              <Plus className="w-4 h-4" /> Hinzufügen
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 mb-4">
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="rounded" />
          Erledigte anzeigen
        </label>
      </div>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-white">Aufgabenliste</h2></CardHeader>
        <CardContent className="space-y-2">
          {visible.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Keine offenen Aufgaben. Ausschreibungen zur Watchlist hinzufügen oder oben neue Tasks anlegen.
            </p>
          ) : (
            visible.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-lg border border-dark-500/50 ${
                  task.completed ? 'opacity-50' : 'hover:bg-dark-600/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggle(task.id)}
                  className="mt-1 rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-white ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Fällig: {task.dueDate}</p>
                  {task.tenderId && (
                    <button
                      type="button"
                      onClick={() => openTender(task.tenderId!)}
                      className="text-xs text-pht-400 hover:text-pht-300 mt-1 truncate block max-w-full text-left"
                    >
                      {task.tenderTitle?.slice(0, 60) ?? 'Ausschreibung öffnen'}
                    </button>
                  )}
                </div>
                {task.source === 'manual' && (
                  <button type="button" onClick={() => setStored(removeTodo(task.id))} className="p-1 text-slate-600 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
