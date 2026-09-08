import { CalendarDays, Check, Download, ListTodo, Mic, Trash2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CustomerPriority } from '../../types/customerPriority';
import type { PlaudNote } from '../../types/plaud';
import { isCustomerArchived } from '../../services/customerVisitStorage';
import {
  applyPlaudActionItemsToTodos,
  applyPlaudToVisitReport,
  connectPlaudAccount,
  fetchPlaudAccountStatus,
  fetchPlaudInbox,
  plaudVisitDate,
  suggestCustomersForPlaud,
  syncPlaudInbox,
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

interface PlaudInboxPanelProps {
  focusId?: string | null;
  customers?: CustomerPriority[];
  onApplied?: () => void;
  hideWhenEmpty?: boolean;
}

export function PlaudInboxPanel({
  focusId,
  customers = [],
  onApplied,
  hideWhenEmpty = false,
}: PlaudInboxPanelProps) {
  const [notes, setNotes] = useState<PlaudNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; href?: string; hrefLabel?: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(focusId ?? null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerPriority | null>(null);
  const [visitDate, setVisitDate] = useState('');
  const [recordAsVisit, setRecordAsVisit] = useState(true);
  const [applyTodos, setApplyTodos] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  const activeCustomers = useMemo(
    () => customers.filter((c) => !isCustomerArchived(c.id)),
    [customers],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    const [list, status] = await Promise.all([
      fetchPlaudInbox(false),
      fetchPlaudAccountStatus(),
    ]);
    setNotes(list);
    setConnected(status.connected);
    setLoading(false);
    return status;
  }, []);

  useEffect(() => {
    void (async () => {
      const status = await reload();
      if (!status.connected) return;
      setPulling(true);
      const result = await syncPlaudInbox();
      setPulling(false);
      if (result.error === 'not-connected') {
        setConnected(false);
        return;
      }
      if (!result.ok) {
        setMessage({ text: result.error || 'Abruf fehlgeschlagen.' });
        return;
      }
      const extra = result.pending ? ` · ${result.pending} noch ohne Transkript` : '';
      setMessage({
        text: result.imported
          ? `${result.imported} Aufnahme(n) geholt${extra}.`
          : `Keine neuen Aufnahmen${extra}.`,
      });
      await reload();
    })();
  }, [reload]);

  useEffect(() => {
    if (focusId) setExpanded(focusId);
  }, [focusId]);

  function openAssign(note: PlaudNote) {
    setAssignFor(note.id);
    setSearch('');
    setSelected(null);
    setVisitDate(plaudVisitDate(note));
    setRecordAsVisit(true);
    setApplyTodos((note.actionItems?.length ?? 0) > 0);
    const hints = suggestCustomersForPlaud(note, activeCustomers);
    if (hints.length === 1) setSelected(hints[0]);
  }

  async function onAssign(note: PlaudNote) {
    if (!selected || !visitDate) {
      setMessage({ text: 'Bitte Kunde und Tag wählen.' });
      return;
    }
    setBusyId(note.id);
    applyPlaudToVisitReport(note, selected, {
      date: visitDate,
      recordAsVisit,
      applyTodos,
    });
    await updatePlaudNoteStatus(note.id, 'applied');
    setMessage({
      text: `Gesprächsprotokoll für ${selected.name} am ${visitDate} gespeichert.`,
      href: `/priorities?q=${encodeURIComponent(selected.name)}`,
      hrefLabel: 'In Tourenplanung öffnen',
    });
    setAssignFor(null);
    setSelected(null);
    setBusyId(null);
    onApplied?.();
    await reload();
  }

  async function onApplyTodos(note: PlaudNote) {
    const n = applyPlaudActionItemsToTodos(note);
    await updatePlaudNoteStatus(note.id, 'applied');
    setMessage({ text: `${n} Todo(s) aus „${note.title}“ angelegt.` });
    await reload();
  }

  async function onDismiss(note: PlaudNote) {
    await updatePlaudNoteStatus(note.id, 'dismissed');
    setMessage({ text: 'Notiz verworfen.' });
    await reload();
  }

  async function onConnect() {
    if (!token.trim()) {
      setMessage({ text: 'Bitte Token einfügen.' });
      return;
    }
    setConnecting(true);
    const result = await connectPlaudAccount(token.trim());
    setConnecting(false);
    setToken('');
    if (!result.ok || !result.connected) {
      setMessage({ text: result.error || 'Plaud-Login fehlgeschlagen.' });
      setConnected(false);
      return;
    }
    setConnected(true);
    setMessage({ text: 'Plaud verbunden. Hole Aufnahmen…' });
    await onPull();
  }

  async function onPull() {
    setPulling(true);
    const result = await syncPlaudInbox();
    setPulling(false);
    if (result.error === 'not-connected') {
      setConnected(false);
      setMessage({ text: 'Zuerst Plaud verbinden (Token unten).' });
      return;
    }
    if (!result.ok) {
      setMessage({ text: result.error || 'Abruf fehlgeschlagen.' });
      return;
    }
    setConnected(true);
    const extra = result.pending ? ` · ${result.pending} noch ohne Transkript` : '';
    setMessage({
      text: result.imported
        ? `${result.imported} Aufnahme(n) geholt${extra}.`
        : `Keine neuen Aufnahmen${extra}.`,
    });
    await reload();
  }

  if (hideWhenEmpty && !loading && notes.length === 0 && connected !== false) return null;

  return (
    <div id="plaud" className="mb-4 rounded-xl border-2 border-violet-400/70 bg-violet-500/10 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Mic className="w-4 h-4 text-violet-300" />
            Plaud Note Inbox
            {notes.length > 0 ? ` (${notes.length} offen)` : ''}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={pulling}
            onClick={() => void onPull()}
            className="inline-flex items-center gap-1 text-xs text-violet-200 hover:text-white disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {pulling ? 'Hole…' : 'Von Plaud holen'}
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            className="text-xs text-violet-300 hover:text-violet-200"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      {message && (
        <p className="text-xs text-emerald-300 bg-emerald-500/10 rounded-lg px-2 py-1.5">
          {message.text}
          {message.href && (
            <>
              {' '}
              <Link to={message.href} className="underline hover:text-emerald-200">
                {message.hrefLabel ?? 'Öffnen'}
              </Link>
            </>
          )}
        </p>
      )}

      {connected === false && (
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void onConnect();
          }}
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="refresh_token aus .plaud/tokens.json"
            autoComplete="off"
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-500 text-xs text-white"
          />
          <button
            type="submit"
            disabled={connecting}
            className="px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs disabled:opacity-50"
          >
            {connecting ? '…' : 'Verbinden'}
          </button>
        </form>
      )}

      {!loading && notes.length === 0 && (
        <p className="text-xs text-slate-500">
          Keine offenen Plaud-Notizen.
        </p>
      )}

      <ul className="space-y-2">
        {notes.map((note) => {
          const open = expanded === note.id;
          const assigning = assignFor === note.id;
          const hints = assigning ? suggestCustomersForPlaud(note, activeCustomers) : [];
          const pickList = search.trim()
            ? activeCustomers
                .filter((c) => {
                  const q = search.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q)
                    || c.city.toLowerCase().includes(q)
                    || c.zip.includes(q)
                  );
                })
                .slice(0, 8)
            : hints.slice(0, 8);
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

                  {assigning && (
                    <div className="rounded-lg border border-violet-400/30 bg-violet-500/5 p-2.5 space-y-2">
                      <label className="block text-[11px] text-slate-400">
                        Tag
                        <input
                          type="date"
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-500 text-xs text-white"
                        />
                      </label>
                      {selected ? (
                        <p className="text-xs text-white">
                          Kunde:{' '}
                          <span className="font-medium">{selected.name}</span>
                          <span className="text-slate-500"> · {selected.zip} {selected.city}</span>
                          {' '}
                          <button
                            type="button"
                            className="text-violet-300 hover:text-violet-200"
                            onClick={() => setSelected(null)}
                          >
                            ändern
                          </button>
                        </p>
                      ) : (
                        <>
                          <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Kunde suchen…"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-500 text-xs text-white"
                          />
                          {hints.length > 0 && !search.trim() && (
                            <p className="text-[11px] text-violet-300">
                              Vorschlag aus Titel/Summary
                            </p>
                          )}
                          <ul className="max-h-40 overflow-y-auto space-y-0.5">
                            {pickList.map((c) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelected(c)}
                                  className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-dark-700"
                                >
                                  {c.name}
                                  <span className="text-slate-600"> · {c.zip} {c.city}</span>
                                </button>
                              </li>
                            ))}
                            {pickList.length === 0 && (
                              <li className="text-[11px] text-slate-500 px-2 py-1">
                                {activeCustomers.length === 0
                                  ? 'Kundenliste wird geladen…'
                                  : 'Kein Treffer – Namen oder Ort eingeben.'}
                              </li>
                            )}
                          </ul>
                        </>
                      )}
                      <label className="flex items-center gap-2 text-[11px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={recordAsVisit}
                          onChange={(e) => setRecordAsVisit(e.target.checked)}
                          className="rounded border-dark-500"
                        />
                        Besuch für diesen Tag erfassen
                      </label>
                      <label className="flex items-center gap-2 text-[11px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={applyTodos}
                          onChange={(e) => setApplyTodos(e.target.checked)}
                          className="rounded border-dark-500"
                        />
                        Action Items als Todos übernehmen
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === note.id || !selected || !visitDate}
                          onClick={() => void onAssign(note)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 text-white px-2.5 py-1.5 text-xs font-medium hover:bg-violet-500 disabled:opacity-50"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          Als Gesprächsprotokoll zuordnen
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignFor(null)}
                          className="text-xs text-slate-500 hover:text-slate-300"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {!assigning && (
                      <button
                        type="button"
                        onClick={() => openAssign(note)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/20 text-violet-200 px-2.5 py-1.5 text-xs hover:bg-violet-500/30"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Kunde & Tag zuordnen
                      </button>
                    )}
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
