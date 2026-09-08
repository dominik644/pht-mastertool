import { Check, Mic, Trash2, ListTodo } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { PlaudNote } from '../../types/plaud';
import {
  applyPlaudActionItemsToTodos,
  fetchPlaudInbox,
  updatePlaudNoteStatus,
} from '../../services/plaudInbox';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PlaudInboxPanel({ focusId }: { focusId?: string | null }) {
  const [notes, setNotes] = useState<PlaudNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(focusId ?? null);

  const reload = useCallback(async () => {
    setLoading(true);
    const list = await fetchPlaudInbox(false);
    setNotes(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (focusId) setExpanded(focusId);
  }, [focusId]);

  async function onApplyTodos(note: PlaudNote) {
    const n = applyPlaudActionItemsToTodos(note);
    await updatePlaudNoteStatus(note.id, 'applied');
    setMessage(`${n} Todo(s) aus „${note.title}“ angelegt.`);
    await reload();
  }

  async function onDismiss(note: PlaudNote) {
    await updatePlaudNoteStatus(note.id, 'dismissed');
    setMessage(`Notiz verworfen.`);
    await reload();
  }

  return (
    <div id="plaud" className="mb-4 rounded-xl border-2 border-violet-400/70 bg-violet-500/10 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Mic className="w-4 h-4 text-violet-300" />
            Plaud Note Inbox
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Neue Transkripte/Summaries vom Plaud-Gerät (via Zapier).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="text-xs text-violet-300 hover:text-violet-200"
        >
          Aktualisieren
        </button>
      </div>

      {message && (
        <p className="text-xs text-emerald-300 bg-emerald-500/10 rounded-lg px-2 py-1.5">{message}</p>
      )}

      {loading && <p className="text-xs text-slate-500">Lade Notizen…</p>}

      {!loading && notes.length === 0 && (
        <p className="text-xs text-slate-500">
          Keine offenen Plaud-Notizen. Zapier auf <code className="text-slate-400">/api/plaud</code> zeigen.
        </p>
      )}

      <ul className="space-y-2">
        {notes.map((note) => {
          const open = expanded === note.id;
          return (
            <li
              key={note.id}
              className="rounded-lg border border-violet-400/30 bg-slate-950/40 p-3 space-y-2"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpanded(open ? null : note.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white truncate">{note.title}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {formatWhen(note.recordedAt || note.receivedAt)}
                  </span>
                </div>
                {note.summary && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{note.summary}</p>
                )}
              </button>

              {open && (
                <div className="space-y-2 pt-1 border-t border-violet-400/20">
                  {note.summary && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-violet-300/80 mb-0.5">Summary</p>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">{note.summary}</p>
                    </div>
                  )}
                  {note.transcript && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-violet-300/80 mb-0.5">Transkript</p>
                      <p className="text-xs text-slate-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {note.transcript}
                      </p>
                    </div>
                  )}
                  {(note.actionItems?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-violet-300/80 mb-0.5">Action Items</p>
                      <ul className="text-xs text-slate-300 list-disc pl-4 space-y-0.5">
                        {note.actionItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void onApplyTodos(note)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/20 text-violet-200 px-2.5 py-1.5 text-xs hover:bg-violet-500/30"
                    >
                      <ListTodo className="w-3.5 h-3.5" />
                      Als Todos übernehmen
                    </button>
                    <button
                      type="button"
                      onClick={() => void updatePlaudNoteStatus(note.id, 'applied').then(reload)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 text-emerald-200 px-2.5 py-1.5 text-xs hover:bg-emerald-500/25"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Erledigt
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDismiss(note)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-500/20 text-slate-300 px-2.5 py-1.5 text-xs hover:bg-slate-500/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Verwerfen
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
