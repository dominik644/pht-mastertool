import {
  AlertCircle, CalendarCheck, ChevronDown, ExternalLink, MapPin, Search, Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useViewMode } from '../context/ViewModeContext';
import {
  countDueVisits,
  fetchCustomerPriorities,
  filterCustomers,
  getDaysUntilDue,
  getVisitState,
  getVisitUrgency,
  loadVisitStore,
  recordVisit,
  uniqueSectors,
  updateVisitNotes,
  VISIT_CADENCE_LABEL,
} from '../services/customerVisitStorage';
import type { CustomerPrioritiesData, CustomerPriority, VisitPriority } from '../types/customerPriority';

const PRIORITY_VARIANT = { A: 'success' as const, B: 'warning' as const, C: 'muted' as const };
const URGENCY_LABEL = { overdue: 'überfällig', due_soon: 'bald fällig', ok: 'im Plan', none: 'kein Termin' };

const PLACEHOLDER_COLLEAGUES = ['Weitere Kollegen', 'Vertrieb Ost', 'Vertrieb West'];

function PriorityStats({ data }: { data: CustomerPrioritiesData }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card>
        <CardContent className="py-3">
          <p className="text-xs text-slate-500">Aus Excel (AT-Fokus)</p>
          <p className="text-xl font-bold text-white mt-1">{data.importedFromExcel}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3">
          <p className="text-xs text-slate-500">Recherche DACH</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">+{data.addedFromResearch}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3">
          <p className="text-xs text-slate-500">Priorität A / B / C</p>
          <p className="text-xl font-bold text-white mt-1">
            <span className="text-emerald-400">{data.priorityCounts.A}</span>
            {' / '}
            <span className="text-amber-400">{data.priorityCounts.B}</span>
            {' / '}
            <span className="text-slate-400">{data.priorityCounts.C}</span>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3">
          <p className="text-xs text-slate-500">Besuchskadenz</p>
          <p className="text-sm text-slate-300 mt-1">A {data.visitCadence.A} · B {data.visitCadence.B} · C {data.visitCadence.C}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerRow({
  customer,
  onVisitRecorded,
}: {
  customer: CustomerPriority;
  onVisitRecorded: () => void;
}) {
  const visit = getVisitState(customer.id);
  const urgency = getVisitUrgency(visit.nextDue);
  const daysUntil = getDaysUntilDue(visit.nextDue);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(visit.notes);

  const handleVisit = () => {
    recordVisit(customer.id, customer.visitCadenceMonths);
    onVisitRecorded();
  };

  const handleSaveNotes = () => {
    updateVisitNotes(customer.id, notes);
    setNotesOpen(false);
    onVisitRecorded();
  };

  return (
    <div className="p-3 rounded-xl border border-dark-500/50 hover:border-pht-500/30 transition-colors space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-dark-600 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-bold text-pht-400">{customer.potentialScore}</span>
          <span className="text-[8px] text-slate-600">POT</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-white">{customer.name}</p>
            <Badge variant={PRIORITY_VARIANT[customer.priority]}>Prio {customer.priority}</Badge>
            {customer.source === 'research' && <Badge variant="muted">Recherche</Badge>}
            {customer.isMeatIndustry && <Badge variant="danger">Fleisch ↓</Badge>}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {customer.zip} {customer.city} · {customer.country} · {customer.sectorLabel}
          </p>
          {customer.excelStatus && (
            <p className="text-xs text-slate-600 mt-1">{customer.excelStatus}</p>
          )}
          {customer.expansionNote && (
            <p className="text-xs text-emerald-400/90 mt-1">{customer.expansionNote}</p>
          )}
          {customer.exchangePotential.length > 0 && (
            <p className="text-xs text-amber-400/80 mt-1">Austausch: {customer.exchangePotential.join(' · ')}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {urgency === 'overdue' && <Badge variant="danger">{URGENCY_LABEL.overdue}</Badge>}
          {urgency === 'due_soon' && <Badge variant="warning">{URGENCY_LABEL.due_soon}</Badge>}
          {urgency === 'ok' && visit.nextDue && (
            <span className="text-[10px] text-slate-500">in {daysUntil}T</span>
          )}
          {visit.lastVisit && (
            <span className="text-[10px] text-slate-600">Letzter: {visit.lastVisit}</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleVisit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700 min-h-[36px]"
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          Besuch erfasst ({VISIT_CADENCE_LABEL[customer.priority]})
        </button>
        <button
          type="button"
          onClick={() => setNotesOpen((o) => !o)}
          className="px-3 py-1.5 rounded-lg border border-dark-500 text-slate-400 text-xs hover:bg-dark-700 min-h-[36px]"
        >
          Notizen
        </button>
        {customer.researchUrl && (
          <a
            href={customer.researchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dark-500 text-slate-400 text-xs hover:bg-dark-700 min-h-[36px]"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Quelle
          </a>
        )}
      </div>
      {notesOpen && (
        <div className="flex gap-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Besuchsnotiz…"
            className="flex-1 px-3 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
          />
          <button type="button" onClick={handleSaveNotes} className="px-3 py-2 rounded-lg bg-dark-600 text-xs text-white">
            Speichern
          </button>
        </div>
      )}
    </div>
  );
}

export function CustomerPrioritiesPage() {
  const { isMobileView } = useViewMode();
  const [data, setData] = useState<CustomerPrioritiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitTick, setVisitTick] = useState(0);
  const [priorityFilter, setPriorityFilter] = useState<VisitPriority | 'all'>('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [hideMeat, setHideMeat] = useState(false);
  const [section, setSection] = useState<string>('Dominik Weller');

  const refreshVisits = useCallback(() => setVisitTick((t) => t + 1), []);

  useEffect(() => {
    void fetchCustomerPriorities().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const dominikCustomers = useMemo(() => {
    if (!data) return [];
    return filterCustomers(data.customers, {
      priority: priorityFilter,
      sector: sectorFilter,
      owner: 'Dominik Weller',
      search,
      hideMeat,
    });
  }, [data, priorityFilter, sectorFilter, search, hideMeat]);

  const sectors = useMemo(() => (data ? uniqueSectors(data.customers) : []), [data]);

  const dueCount = useMemo(() => {
    if (!data) return 0;
    void visitTick;
    const store = loadVisitStore();
    return countDueVisits(
      data.customers.filter((c) => c.owner === 'Dominik Weller'),
      store,
    );
  }, [data, visitTick]);

  if (loading) {
    return (
      <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-7xl mx-auto`}>
        <p className="text-slate-500">Prioritätenliste wird geladen…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-7xl mx-auto`}>
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            Kundendaten nicht gefunden. Bitte <code className="text-pht-400">npm run import:priorities</code> ausführen.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-7xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-5' : 'mb-6'}`}>
        <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
          <Users className={`${isMobileView ? 'w-6 h-6' : 'w-7 h-7'} text-pht-400`} />
          Kunden-Prioritätenliste
        </h1>
        <p className="text-slate-400 mt-1 text-xs sm:text-sm">
          {data.strategy} · Stand {new Date(data.generatedAt).toLocaleDateString('de-DE')}
        </p>
        {dueCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {dueCount} Kunden mit fälligem oder bald fälligem Besuch
          </div>
        )}
      </header>

      <div className="mb-6">
        <PriorityStats data={data} />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSection('Dominik Weller')}
          className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
            section === 'Dominik Weller' ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
          }`}
        >
          Dominik Weller
        </button>
        {PLACEHOLDER_COLLEAGUES.map((name) => (
          <button
            key={name}
            type="button"
            disabled
            title="Demnächst verfügbar"
            className="px-4 py-2 rounded-lg text-sm font-medium shrink-0 bg-dark-800 text-slate-600 cursor-not-allowed"
          >
            {name}
          </button>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="py-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kunde, Ort, Branche…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as VisitPriority | 'all')}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
              >
                <option value="all">Alle Prioritäten</option>
                <option value="A">Prio A</option>
                <option value="B">Prio B</option>
                <option value="C">Prio C</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white max-w-[180px]"
              >
                <option value="all">Alle Branchen</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-500 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={hideMeat}
                onChange={(e) => setHideMeat(e.target.checked)}
                className="rounded"
              />
              Fleisch ausblenden
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white">
            {section} · {dominikCustomers.length} Kunden
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sortiert nach Potenzial · Keine Umsatzdaten · Besuchsstatus in localStorage
          </p>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
          {dominikCustomers.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Keine Kunden für diesen Filter.</p>
          ) : (
            dominikCustomers.map((c) => (
              <CustomerRow key={c.id} customer={c} onVisitRecorded={refreshVisits} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
