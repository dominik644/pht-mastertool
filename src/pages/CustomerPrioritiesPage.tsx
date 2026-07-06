import {
  AlertCircle, Bell, CalendarCheck, ChevronDown, Download, ExternalLink, Filter,
  GitBranch, LayoutGrid, List, Map as MapIcon, MapPin, Printer, RefreshCw, Search, SkipForward, Users, X,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AustriaBundeslandMap } from '../components/customerPriorities/AustriaBundeslandMap';
import { BundeslandCards } from '../components/customerPriorities/BundeslandCards';
import { PlanInOutlookButton } from '../components/customerPriorities/PlanInOutlookButton';
import { PrioritySelector } from '../components/customerPriorities/PrioritySelector';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useViewMode } from '../context/ViewModeContext';
import { AT_BUNDESLAND_ORDER, BUNDESLAND_SHORT } from '../lib/bundeslandFromPlz';
import {
  computeBundeslandOverview,
  computeVisitDashboardKpis,
  countDueVisits,
  countPriorities,
  exportTourListCsv,
  fetchCustomerPriorities,
  filterCustomers,
  formatPriorityCounts,
  getCustomerVisitUrgency,
  getDaysUntilDue,
  getVisitState,
  loadVisitStore,
  migrateVisitStore,
  OVERDUE_BANNER_KEY,
  recalculateDueDates,
  recordVisit,
  resolveCadenceMonths,
  setCustomerArchived,
  skipVisit,
  sortByNextVisit,
  uniqueBundeslaender,
  uniqueSectors,
  updateVisitNotes,
  URGENCY_LABEL,
  VISIT_CADENCE_LABEL,
  type QuickFilter,
} from '../services/customerVisitStorage';
import { planCustomerVisitInOutlook } from '../services/visitOutlookIntegrations';
import {
  addFromCustomer, findBySource, isInPipeline, PIPELINE_CHANGED_EVENT,
} from '../services/salesPipelineStorage';
import { fetchCustomerGeocodes, type CustomerGeocodesFile } from '../services/customerGeocodes';
import { VERTRIEB_OST_BUNDESLAENDER } from '../lib/territoryConfig';
import {
  applyEffectivePriorities,
  isPriorityOverridden,
  loadPriorityOverrides,
  PRIORITY_CHANGED_EVENT,
  setPriorityOverride,
} from '../services/customerPriorityOverrides';
import type { CustomerPrioritiesData, CustomerPriority, VisitPriority } from '../types/customerPriority';

const CustomerTerritoryMap = lazy(() =>
  import('../components/customerPriorities/CustomerTerritoryMap').then((m) => ({
    default: m.CustomerTerritoryMap,
  })),
);

type SalesSection = 'Dominik Weller' | 'Vertrieb Ost' | 'Vertrieb West' | 'Weitere Kollegen';

const SECTION_OPTIONS: { id: SalesSection; label: string; enabled: boolean }[] = [
  { id: 'Dominik Weller', label: 'Dominik Weller', enabled: true },
  { id: 'Vertrieb Ost', label: 'Vertrieb Ost', enabled: true },
  { id: 'Vertrieb West', label: 'Vertrieb West', enabled: false },
  { id: 'Weitere Kollegen', label: 'Weitere Kollegen', enabled: false },
];

type ViewMode = 'list' | 'cards' | 'map';

const QUICK_CHIPS: { id: QuickFilter; label: string }[] = [
  { id: 'a', label: 'Nur A' },
  { id: 'overdue', label: 'Nur überfällig' },
  { id: 'research', label: 'Nur Recherche-Leads' },
  { id: 'week', label: 'Fällig diese Woche' },
];

function parseBlParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function KpiStrip({ kpis }: { kpis: { overdue: number; aDueThisMonth: number; visitsThisWeek: number } }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5">
        <p className="text-[10px] sm:text-xs text-slate-500">Überfällig</p>
        <p className="text-lg sm:text-xl font-bold text-red-400 tabular-nums">{kpis.overdue}</p>
      </div>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
        <p className="text-[10px] sm:text-xs text-slate-500">A fällig Monat</p>
        <p className="text-lg sm:text-xl font-bold text-emerald-400 tabular-nums">{kpis.aDueThisMonth}</p>
      </div>
      <div className="rounded-xl border border-pht-500/30 bg-pht-600/5 px-3 py-2.5">
        <p className="text-[10px] sm:text-xs text-slate-500">Besuche Woche</p>
        <p className="text-lg sm:text-xl font-bold text-pht-300 tabular-nums">{kpis.visitsThisWeek}</p>
      </div>
    </div>
  );
}

function CustomerRow({
  customer,
  importPriority: _importPriority,
  isOverridden,
  onPriorityChange,
  onVisitRecorded,
  pipelineTick,
}: {
  customer: CustomerPriority;
  importPriority: VisitPriority;
  isOverridden: boolean;
  onPriorityChange: (priority: VisitPriority) => void;
  onVisitRecorded: () => void;
  pipelineTick: number;
}) {
  void pipelineTick;
  const visit = getVisitState(customer.id);
  const urgency = getCustomerVisitUrgency(customer);
  const daysUntil = getDaysUntilDue(visit.nextDue);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(visit.notes);
  const inPipeline = isInPipeline('customer', customer.id);
  const pipelineEntry = findBySource('customer', customer.id);

  const handleVisit = () => {
    recordVisit(customer.id, resolveCadenceMonths(customer));
    onVisitRecorded();
  };

  const handleSkip = () => {
    skipVisit(customer.id, resolveCadenceMonths(customer));
    onVisitRecorded();
  };

  const handleArchive = () => {
    setCustomerArchived(customer.id, true);
    onVisitRecorded();
  };

  const handleSaveNotes = () => {
    updateVisitNotes(customer.id, notes);
    setNotesOpen(false);
    onVisitRecorded();
  };

  const handlePipeline = () => {
    addFromCustomer({
      id: customer.id,
      name: customer.name,
      city: customer.city,
      country: customer.country,
      priority: customer.priority,
      potentialScore: customer.potentialScore,
      researchUrl: customer.researchUrl,
    });
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
            <PrioritySelector
              priority={customer.priority}
              isOverridden={isOverridden}
              onChange={onPriorityChange}
              compact
            />
            {customer.source === 'research' && <Badge variant="muted">Recherche</Badge>}
            {customer.isMeatIndustry && <Badge variant="danger">Fleisch ↓</Badge>}
            {inPipeline && <Badge variant="muted">Pipeline</Badge>}
            {visit.archived && <Badge variant="muted">Archiviert</Badge>}
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
          {visit.notes && !notesOpen && (
            <p className="text-xs text-slate-400 mt-1 italic">„{visit.notes}"</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {urgency === 'overdue' && <Badge variant="danger">{URGENCY_LABEL.overdue}</Badge>}
          {urgency === 'due_soon' && <Badge variant="warning">{URGENCY_LABEL.due_soon}</Badge>}
          {urgency === 'planning' && <Badge variant="muted">{URGENCY_LABEL.planning}</Badge>}
          {urgency === 'ok' && visit.nextDue && (
            <span className="text-[10px] text-slate-500">in {daysUntil}T</span>
          )}
          {visit.nextDue && (
            <span className="text-[10px] text-slate-600">Fällig: {visit.nextDue}</span>
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
          onClick={handleSkip}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-500 text-slate-400 text-xs hover:bg-dark-700 min-h-[36px]"
          title="Nächsten Termin um ein Intervall verschieben"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Überspringen
        </button>
        <button
          type="button"
          onClick={handleArchive}
          className="px-3 py-1.5 rounded-lg border border-dark-500 text-slate-500 text-xs hover:bg-dark-700 hover:text-slate-300 min-h-[36px]"
        >
          Nicht mehr relevant
        </button>
        <PlanInOutlookButton onPlan={() => planCustomerVisitInOutlook(customer)} />
        <button
          type="button"
          onClick={() => setNotesOpen((o) => !o)}
          className="px-3 py-1.5 rounded-lg border border-dark-500 text-slate-400 text-xs hover:bg-dark-700 min-h-[36px]"
        >
          Notizen
        </button>
        {inPipeline ? (
          <Link
            to="/command-center?tab=pipeline"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-pht-500/40 text-pht-300 text-xs hover:bg-pht-600/10 min-h-[36px]"
          >
            <GitBranch className="w-3.5 h-3.5" /> Pipeline
          </Link>
        ) : (
          <button
            type="button"
            onClick={handlePipeline}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dark-500 text-slate-400 text-xs hover:bg-dark-700 min-h-[36px]"
          >
            <GitBranch className="w-3.5 h-3.5" /> + Pipeline
          </button>
        )}
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
        {pipelineEntry?.notes && (
          <span className="text-[10px] text-slate-600 self-center">{pipelineEntry.notes}</span>
        )}
      </div>
      {notesOpen && (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Besuchsnotizen, Gesprächspunkte, offene Themen…"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white resize-y min-h-[4rem]"
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleSaveNotes} className="px-3 py-2 rounded-lg bg-dark-600 text-xs text-white">
              Speichern
            </button>
            <button type="button" onClick={() => setNotesOpen(false)} className="px-3 py-2 rounded-lg border border-dark-500 text-xs text-slate-400">
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomerPrioritiesPage() {
  const { isMobileView } = useViewMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<CustomerPrioritiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitTick, setVisitTick] = useState(0);
  const [priorityTick, setPriorityTick] = useState(0);
  const [pipelineTick, setPipelineTick] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [section, setSection] = useState<SalesSection>(() => {
    const t = new URLSearchParams(window.location.search).get('territory');
    if (t === 'ost') return 'Vertrieb Ost';
    return 'Dominik Weller';
  });
  const [geocodes, setGeocodes] = useState<CustomerGeocodesFile | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(OVERDUE_BANNER_KEY) === '1',
  );
  const filterRef = useRef<HTMLDivElement>(null);

  const priorityFilter = (searchParams.get('prio') as VisitPriority | 'all' | null) ?? 'all';
  const sectorFilter = searchParams.get('sector') ?? 'all';
  const search = searchParams.get('q') ?? '';
  const hideMeat = searchParams.get('meat') === '1';
  const bundeslandFilter = parseBlParam(searchParams.get('bl'));
  const quickFilter = (searchParams.get('quick') as QuickFilter | null) ?? null;
  const showArchived = searchParams.get('archived') === '1';
  const viewMode = (searchParams.get('view') as ViewMode | null) ?? 'list';

  const updateParams = useCallback((patch: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, val] of Object.entries(patch)) {
        if (val == null || val === '' || val === 'all') next.delete(key);
        else next.set(key, val);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setPriorityFilter = (v: VisitPriority | 'all') => updateParams({ prio: v === 'all' ? null : v });
  const setSectorFilter = (v: string) => updateParams({ sector: v === 'all' ? null : v });
  const setSearch = (v: string) => updateParams({ q: v || null });
  const setHideMeat = (v: boolean) => updateParams({ meat: v ? '1' : null });
  const setBundeslandFilter = (v: string[]) => updateParams({ bl: v.length ? v.join(',') : null });
  const setQuickFilter = (v: QuickFilter | null) => updateParams({ quick: v });
  const setShowArchived = (v: boolean) => updateParams({ archived: v ? '1' : null });
  const setViewMode = (v: ViewMode) => updateParams({ view: v === 'list' ? null : v });

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
      if (d) migrateVisitStore(applyEffectivePriorities(d.customers));
      setData(d);
      setLoading(false);
    });
    void fetchCustomerGeocodes().then(setGeocodes);
  }, []);

  const prevSectionRef = useRef(section);
  useEffect(() => {
    if (section === 'Vertrieb Ost' && prevSectionRef.current !== 'Vertrieb Ost') {
      setBundeslandFilter([...VERTRIEB_OST_BUNDESLAENDER]);
      setViewMode('map');
    }
    prevSectionRef.current = section;
  }, [section, setBundeslandFilter, setViewMode]);

  useEffect(() => {
    const onPipeline = () => setPipelineTick((t) => t + 1);
    window.addEventListener(PIPELINE_CHANGED_EVENT, onPipeline);
    return () => window.removeEventListener(PIPELINE_CHANGED_EVENT, onPipeline);
  }, []);

  useEffect(() => {
    const onPriority = () => setPriorityTick((t) => t + 1);
    window.addEventListener(PRIORITY_CHANGED_EVENT, onPriority);
    return () => window.removeEventListener(PRIORITY_CHANGED_EVENT, onPriority);
  }, []);

  const priorityOverrides = useMemo(() => {
    void priorityTick;
    return loadPriorityOverrides();
  }, [priorityTick]);

  const importPriorityById = useMemo(() => {
    if (!data) return new Map<string, VisitPriority>();
    return new Map(data.customers.map((c) => [c.id, c.priority]));
  }, [data]);

  const handlePriorityChange = useCallback((customerId: string, priority: VisitPriority) => {
    const importPriority = importPriorityById.get(customerId);
    if (!importPriority) return;
    setPriorityOverride(customerId, priority, importPriority);
    setPriorityTick((t) => t + 1);
    refreshVisits();
  }, [importPriorityById, refreshVisits]);

  const visitStore = useMemo(() => {
    void visitTick;
    void priorityTick;
    if (!data) return loadVisitStore();
    const effective = applyEffectivePriorities(data.customers, priorityOverrides);
    return migrateVisitStore(effective);
  }, [visitTick, priorityTick, data, priorityOverrides]);

  const rawOwnerCustomers = useMemo(() => {
    if (!data) return [];
    if (section === 'Vertrieb Ost') {
      return data.customers.filter(
        (c) => c.owner === 'Dominik Weller'
          && c.bundesland
          && (VERTRIEB_OST_BUNDESLAENDER as readonly string[]).includes(c.bundesland),
      );
    }
    if (section === 'Dominik Weller') {
      return data.customers.filter((c) => c.owner === 'Dominik Weller');
    }
    return data.customers.filter((c) => c.owner === section);
  }, [data, section]);

  const ownerCustomers = useMemo(
    () => applyEffectivePriorities(rawOwnerCustomers, priorityOverrides),
    [rawOwnerCustomers, priorityOverrides],
  );

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

  const bundeslandOverview = useMemo(
    () => computeBundeslandOverview(ownerCustomers, visitStore),
    [ownerCustomers, visitStore],
  );

  const filteredCustomers = useMemo(() => {
    const list = filterCustomers(ownerCustomers, {
      priority: priorityFilter,
      sector: sectorFilter,
      search,
      hideMeat,
      bundeslaender: bundeslandFilter,
      quickFilter,
      store: visitStore,
      showArchived,
    });
    return sortByNextVisit(list, visitStore);
  }, [ownerCustomers, priorityFilter, sectorFilter, search, hideMeat, bundeslandFilter, quickFilter, visitStore, showArchived]);

  const filteredPriorityCounts = useMemo(
    () => countPriorities(filteredCustomers),
    [filteredCustomers],
  );

  const dashboardKpis = useMemo(
    () => computeVisitDashboardKpis(ownerCustomers, visitStore),
    [ownerCustomers, visitStore],
  );

  const activeFilterCount = useMemo(() => [
    priorityFilter !== 'all',
    sectorFilter !== 'all',
    hideMeat,
    bundeslandFilter.length > 0,
    quickFilter != null,
    showArchived,
  ].filter(Boolean).length, [priorityFilter, sectorFilter, hideMeat, bundeslandFilter, quickFilter, showArchived]);

  const sectors = useMemo(() => uniqueSectors(ownerCustomers), [ownerCustomers]);

  const toggleBundesland = (name: string) => {
    setBundeslandFilter(
      bundeslandFilter.includes(name)
        ? bundeslandFilter.filter((b) => b !== name)
        : [...bundeslandFilter, name],
    );
    if (viewMode !== 'list') setViewMode('list');
  };

  const resetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const dueCount = useMemo(
    () => countDueVisits(ownerCustomers, visitStore),
    [ownerCustomers, visitStore],
  );

  const dismissBanner = () => {
    localStorage.setItem(OVERDUE_BANNER_KEY, '1');
    setBannerDismissed(true);
  };

  const handleRecalculateDue = () => {
    if (!data) return;
    recalculateDueDates(ownerCustomers);
    refreshVisits();
  };

  const handleExport = () => {
    const blLabel = bundeslandFilter.length === 1
      ? BUNDESLAND_SHORT[bundeslandFilter[0] as keyof typeof BUNDESLAND_SHORT] ?? bundeslandFilter[0]
      : bundeslandFilter.length > 1 ? 'multi' : 'alle';
    exportTourListCsv(filteredCustomers, visitStore, `tourliste-${blLabel}.csv`);
  };

  const handlePrint = () => window.print();

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
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-7xl mx-auto print:p-4`}>
      <header className={`${isMobileView ? 'mb-4' : 'mb-5'}`}>
        <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
          <Users className={`${isMobileView ? 'w-6 h-6' : 'w-7 h-7'} text-pht-400`} />
          Kunden-Prioritätenliste
        </h1>
        <p className="text-slate-400 mt-1 text-xs sm:text-sm">
          {data.strategy} · Stand {new Date(data.generatedAt).toLocaleDateString('de-DE')}
        </p>
      </header>

      <div className="mb-4">
        <KpiStrip kpis={dashboardKpis} />
      </div>

      {!bannerDismissed && dashboardKpis.overdue > 0 && (
        <div className="mb-4 flex items-start gap-3 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 print:hidden">
          <Bell className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200">
              {dashboardKpis.overdue} überfällige Kundenbesuche
            </p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Tour planen: Filter „Nur überfällig" oder Bundesland-Karten nutzen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setQuickFilter('overdue'); setViewMode('list'); }}
            className="text-xs text-amber-300 hover:text-white shrink-0 px-2 py-1"
          >
            Anzeigen
          </button>
          <button type="button" onClick={dismissBanner} className="text-slate-500 hover:text-white shrink-0" aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide print:hidden">
        {SECTION_OPTIONS.map(({ id, label, enabled }) => (
          <button
            key={id}
            type="button"
            disabled={!enabled}
            title={enabled ? undefined : 'Demnächst verfügbar'}
            onClick={() => {
              if (!enabled) return;
              setSection(id);
              updateParams({
                territory: id === 'Vertrieb Ost' ? 'ost' : null,
                bl: id === 'Vertrieb Ost' ? VERTRIEB_OST_BUNDESLAENDER.join(',') : null,
                view: id === 'Vertrieb Ost' ? 'map' : null,
              });
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
              section === id
                ? 'bg-pht-600 text-white'
                : enabled
                  ? 'bg-dark-700 text-slate-400 hover:text-white'
                  : 'bg-dark-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 mb-4 bg-dark-900/95 backdrop-blur border-b border-dark-600/50 print:static print:border-0 print:bg-transparent print:mx-0 print:px-0">
        <div className="flex flex-col gap-2 max-w-7xl mx-auto">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickFilter(quickFilter === chip.id ? null : chip.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border transition-colors min-h-[32px] ${
                  quickFilter === chip.id
                    ? 'bg-pht-600 border-pht-500 text-white'
                    : 'border-dark-500 text-slate-400 hover:text-white hover:border-dark-400'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <Card className="border-dark-500/60 shadow-lg print:hidden">
            <CardContent className="py-3 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Kunde, Ort, Bundesland, Branche…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="flex rounded-lg border border-dark-500 overflow-hidden">
                  {([
                    { id: 'list' as const, icon: List, label: 'Liste' },
                    { id: 'cards' as const, icon: LayoutGrid, label: 'BL' },
                    { id: 'map' as const, icon: MapIcon, label: 'Karte' },
                  ]).map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setViewMode(id)}
                      title={label}
                      className={`px-3 py-2 text-xs flex items-center gap-1 min-h-[40px] ${
                        viewMode === id ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <div className="relative" ref={filterRef}>
                  <button
                    type="button"
                    onClick={() => setFilterOpen((o) => !o)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm min-h-[40px] ${
                      activeFilterCount > 0
                        ? 'border-pht-500/50 bg-pht-600/10 text-pht-300'
                        : 'border-dark-500 bg-dark-700 text-slate-300'
                    }`}
                  >
                    <Filter className="w-4 h-4 shrink-0" />
                    {activeFilterCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-pht-600 text-white text-[10px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {filterOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-dark-500 bg-dark-800 shadow-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-white uppercase tracking-wide">Filter</p>
                        <button type="button" onClick={() => setFilterOpen(false)} className="p-1 text-slate-500 hover:text-white" aria-label="Filter schließen">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="rounded-lg bg-dark-700/60 px-3 py-2 text-xs text-slate-400">
                        Angezeigt: <span className="text-emerald-400">{filteredPriorityCounts.A} A</span>
                        {' · '}
                        <span className="text-amber-400">{filteredPriorityCounts.B} B</span>
                        {' · '}
                        <span className="text-slate-300">{filteredPriorityCounts.C} C</span>
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
                                <input type="checkbox" checked={checked} onChange={() => toggleBundesland(bl.name)} className="rounded" />
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
                        <select
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value as VisitPriority | 'all')}
                          className="w-full pl-3 pr-3 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
                        >
                          <option value="all">Alle Prioritäten</option>
                          <option value="A">Prio A</option>
                          <option value="B">Prio B</option>
                          <option value="C">Prio C</option>
                        </select>
                        <select
                          value={sectorFilter}
                          onChange={(e) => setSectorFilter(e.target.value)}
                          className="w-full pl-3 pr-3 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
                        >
                          <option value="all">Alle Branchen</option>
                          {sectors.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={hideMeat} onChange={(e) => setHideMeat(e.target.checked)} className="rounded" />
                        Fleisch ausblenden
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded" />
                        Archivierte anzeigen
                      </label>

                      {activeFilterCount > 0 && (
                        <button type="button" onClick={resetFilters} className="w-full py-2 rounded-lg border border-dark-500 text-xs text-slate-400 hover:text-white hover:bg-dark-700">
                          Filter zurücksetzen
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRecalculateDue}
                  title="Fälligkeit neu berechnen"
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-dark-500 text-slate-400 hover:bg-dark-700 min-h-[40px]"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  title="Tourliste CSV"
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-dark-500 text-slate-400 hover:bg-dark-700 min-h-[40px]"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  title="Drucken"
                  className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg border border-dark-500 text-slate-400 hover:bg-dark-700 min-h-[40px]"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {dueCount > 0 && (
        <div className="mb-4 flex items-center gap-2 text-amber-400 text-sm print:hidden">
          <AlertCircle className="w-4 h-4" />
          {dueCount} Kunden mit fälligem oder bald fälligem Besuch
        </div>
      )}

      {viewMode === 'cards' && (
        <Card className="mb-6 print:hidden">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Bundesländer-Übersicht</h2>
            <p className="text-xs text-slate-500">Tippen zum Filtern · {formatPriorityCounts(filteredPriorityCounts)}</p>
          </CardHeader>
          <CardContent>
            <BundeslandCards
              overview={bundeslandOverview}
              selected={bundeslandFilter}
              onSelect={toggleBundesland}
            />
          </CardContent>
        </Card>
      )}

      {viewMode === 'map' && (
        <Card className="mb-6 print:hidden">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">
              {section === 'Vertrieb Ost' ? 'Territorium Vertrieb Ost' : 'Karten-Modus Österreich'}
            </h2>
            <p className="text-xs text-slate-500">
              Leaflet · OSM · Kundenpunkte · Routenvorschläge ab Pitten
              {section === 'Vertrieb Ost' && (
                <span> · Wien, NÖ, OÖ, STM, Bgld, Ktn</span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-slate-500 py-8 text-center">Interaktive Karte wird geladen…</p>}>
              <CustomerTerritoryMap
                customers={filteredCustomers}
                geocodes={geocodes}
                store={visitStore}
                onPriorityChange={handlePriorityChange}
              />
            </Suspense>
            <div className="mt-6 pt-4 border-t border-dark-600/50">
              <p className="text-[10px] text-slate-600 mb-2">Bundesland-Übersicht (klicken zum Filtern)</p>
              <AustriaBundeslandMap
                overview={bundeslandOverview}
                selected={bundeslandFilter}
                onSelect={toggleBundesland}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {(viewMode === 'list' || filteredCustomers.length > 0) && (
        <Card>
          <CardHeader className="print:pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {section} · {filteredCustomers.length} Kunden
                  <span className="text-slate-500 font-normal ml-2">
                    ({formatPriorityCounts(filteredPriorityCounts)})
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 print:text-black">
                  Sortiert nach nächstem Besuch · Überfällige A zuerst
                  {bundeslandFilter.length > 0 && (
                    <span>
                      {' · '}
                      {bundeslandFilter.map((b) => BUNDESLAND_SHORT[b as keyof typeof BUNDESLAND_SHORT] ?? b).join(', ')}
                    </span>
                  )}
                </p>
              </div>
              {bundeslandFilter.length > 0 && (
                <button
                  type="button"
                  onClick={handleExport}
                  className="print:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pht-600 text-white text-xs hover:bg-pht-700"
                >
                  <Download className="w-3.5 h-3.5" /> Tour exportieren
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">
            {filteredCustomers.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Keine Kunden für diesen Filter.</p>
            ) : (
              filteredCustomers.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  importPriority={importPriorityById.get(c.id) ?? c.priority}
                  isOverridden={isPriorityOverridden(c.id, priorityOverrides)}
                  onPriorityChange={(p) => handlePriorityChange(c.id, p)}
                  onVisitRecorded={refreshVisits}
                  pipelineTick={pipelineTick}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      <div className="hidden print:block mt-4 text-xs text-slate-600">
        PHT Tourliste · {new Date().toLocaleDateString('de-DE')} · {filteredCustomers.length} Kunden
      </div>
    </div>
  );
}
