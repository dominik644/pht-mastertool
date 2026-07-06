import {
  AlertCircle, CalendarCheck, ChevronDown, ExternalLink, Filter, MapPin, Search, Users, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useViewMode } from '../context/ViewModeContext';
import { AT_BUNDESLAND_ORDER, BUNDESLAND_SHORT } from '../lib/bundeslandFromPlz';
import {
  countDueVisits,
  countPriorities,
  fetchCustomerPriorities,
  filterCustomers,
  formatPriorityCounts,
  getDaysUntilDue,
  getVisitState,
  getVisitUrgency,
  loadVisitStore,
  recordVisit,
  uniqueBundeslaender,
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
            {customer.zip} {customer.city}
            {customer.bundesland && (
              <span className="text-slate-600">
                · {BUNDESLAND_SHORT[customer.bundesland as keyof typeof BUNDESLAND_SHORT] ?? customer.bundesland}
              </span>
            )}
            {' · '}{customer.country} · {customer.sectorLabel}
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
  const [bundeslandFilter, setBundeslandFilter] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [section, setSection] = useState<string>('Dominik Weller');
  const filterRef = useRef<HTMLDivElement>(null);

  const refreshVisits = useCallback(() => setVisitTick((t) => t + 1), []);

  useEffect(() => {
    if (!filterOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  useEffect(() => {
    void fetchCustomerPriorities().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const ownerCustomers = useMemo(() => {
    if (!data) return [];
    return data.customers.filter((c) => c.owner === section);
  }, [data, section]);

  const bundeslandOptions = useMemo(() => {
    const options = uniqueBundeslaender(ownerCustomers);
    return [...options].sort((a, b) => {
      const atIdxA = AT_BUNDESLAND_ORDER.indexOf(a.name);
      const atIdxB = AT_BUNDESLAND_ORDER.indexOf(b.name);
      if (atIdxA >= 0 && atIdxB >= 0) return atIdxA - atIdxB;
      if (atIdxA >= 0) return -1;
      if (atIdxB >= 0) return 1;
      return a.name.localeCompare(b.name, 'de');
    });
  }, [ownerCustomers]);

  const dominikCustomers = useMemo(() => {
    if (!data) return [];
    return filterCustomers(ownerCustomers, {
      priority: priorityFilter,
      sector: sectorFilter,
      search,
      hideMeat,
      bundeslaender: bundeslandFilter,
    });
  }, [data, ownerCustomers, priorityFilter, sectorFilter, search, hideMeat, bundeslandFilter]);

  const filteredPriorityCounts = useMemo(
    () => countPriorities(dominikCustomers),
    [dominikCustomers],
  );

  const activeFilterCount = useMemo(() => [
    priorityFilter !== 'all',
    sectorFilter !== 'all',
    hideMeat,
    bundeslandFilter.length > 0,
  ].filter(Boolean).length, [priorityFilter, sectorFilter, hideMeat, bundeslandFilter]);

  const sectors = useMemo(() => uniqueSectors(ownerCustomers), [ownerCustomers]);

  const toggleBundesland = (name: string) => {
    setBundeslandFilter((prev) =>
      prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name],
    );
  };

  const resetFilters = () => {
    setPriorityFilter('all');
    setSectorFilter('all');
    setHideMeat(false);
    setBundeslandFilter([]);
  };

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
              placeholder="Kunde, Ort, Bundesland, Branche…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
            />
          </div>
          <div className="relative shrink-0" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm min-h-[44px] ${
                activeFilterCount > 0 || bundeslandFilter.length > 0
                  ? 'border-pht-500/50 bg-pht-600/10 text-pht-300'
                  : 'border-dark-500 bg-dark-700 text-slate-300'
              }`}
            >
              <Filter className="w-4 h-4 shrink-0" />
              <span className="text-left">
                <span className="font-medium">Filter</span>
                <span className="block text-[11px] text-slate-400">
                  {formatPriorityCounts(filteredPriorityCounts)}
                </span>
              </span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-pht-600 text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>

            {filterOpen && (
              <div className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-dark-500 bg-dark-800 shadow-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide">Filter</p>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="p-1 text-slate-500 hover:text-white"
                    aria-label="Filter schließen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="rounded-lg bg-dark-700/60 px-3 py-2 text-xs text-slate-400">
                  Angezeigt: <span className="text-emerald-400">{filteredPriorityCounts.A} A</span>
                  {' · '}
                  <span className="text-amber-400">{filteredPriorityCounts.B} B</span>
                  {' · '}
                  <span className="text-slate-300">{filteredPriorityCounts.C} C</span>
                  {bundeslandFilter.length > 0 && (
                    <span className="block mt-1 text-slate-500">
                      {bundeslandFilter.map((b) => BUNDESLAND_SHORT[b as keyof typeof BUNDESLAND_SHORT] ?? b).join(', ')}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-2">Bundesland</p>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {bundeslandOptions.map((bl) => {
                      const checked = bundeslandFilter.includes(bl.name);
                      const short = BUNDESLAND_SHORT[bl.name as keyof typeof BUNDESLAND_SHORT] ?? bl.name;
                      return (
                        <label
                          key={bl.name}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs ${
                            checked ? 'bg-pht-600/15 text-pht-300' : 'text-slate-400 hover:bg-dark-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBundesland(bl.name)}
                            className="rounded"
                          />
                          <span className="flex-1">{short}</span>
                          <span className="text-[10px] text-slate-600 tabular-nums">
                            {bl.priorities.A}A {bl.priorities.B}B {bl.priorities.C}C
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="relative">
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value as VisitPriority | 'all')}
                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
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
                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
                    >
                      <option value="all">Alle Branchen</option>
                      {sectors.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideMeat}
                    onChange={(e) => setHideMeat(e.target.checked)}
                    className="rounded"
                  />
                  Fleisch ausblenden
                </label>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="w-full py-2 rounded-lg border border-dark-500 text-xs text-slate-400 hover:text-white hover:bg-dark-700"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white">
            {section} · {dominikCustomers.length} Kunden
            <span className="text-slate-500 font-normal ml-2">
              ({formatPriorityCounts(filteredPriorityCounts)})
            </span>
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
