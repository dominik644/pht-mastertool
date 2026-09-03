import {
  AlertCircle, AlertTriangle, Bell, Calendar, CalendarCheck, ChevronDown, Download, ExternalLink, Filter,
  GitBranch, LayoutGrid, List, Mail, Map as MapIcon, MapPin, Printer, RefreshCw, Search, SkipForward, X,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AustriaBundeslandMap } from '../components/customerPriorities/AustriaBundeslandMap';
import { BundeslandCards } from '../components/customerPriorities/BundeslandCards';
import { PlanInOutlookButton } from '../components/customerPriorities/PlanInOutlookButton';
import { CustomerStammdatenForm } from '../components/customerPriorities/CustomerStammdatenForm';
import { CustomerBcDocumentsTab } from '../components/customerPriorities/CustomerBcDocumentsTab';
import { DataHealthPanel } from '../components/customerPriorities/DataHealthPanel';
import { CustomerOutreachActions } from '../components/customerPriorities/CustomerOutreachActions';
import { CustomerScheduleProposalButton } from '../components/customerPriorities/CustomerScheduleProposalButton';
import { CustomerCustomRequestBadge } from '../components/customerPriorities/CustomerCustomRequestBadge';
import { ConfirmedVisitBadge, UpcomingVisitsStrip } from '../components/customerPriorities/UpcomingVisitsStrip';
import { SalesFeedbackButtons, VisitRelevanceToggle } from '../components/customerPriorities/SalesFeedbackButtons';
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
  dismissNewLead,
  exportTourListCsv,
  exportContactEmailsCsv,
  fetchCustomerPriorities,
  filterCustomers,
  formatPriorityCounts,
  getCustomerVisitUrgency,
  getDaysUntilDue,
  getVisitState,
  getUpcomingConfirmedVisits,
  isNewCustomer,
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
  VISIT_STORE_CHANGED_EVENT,
  type QuickFilter,
} from '../services/customerVisitStorage';
import { planCustomerVisitInOutlook, planTourInOutlook, TOUR_STOP_COUNT } from '../services/visitOutlookIntegrations';
import { computeDataHealth, customersMissingEmail, customersOverdueA } from '../services/dataHealth';
import { hydrateSalesDataFromSupabase } from '../services/salesSync';
import { fetchCustomRequests, type ScheduleCustomRequest } from '../services/scheduleProposal';
import {
  addFromCustomer, findBySource, isInPipeline, PIPELINE_CHANGED_EVENT,
} from '../services/salesPipelineStorage';
import { fetchCustomerGeocodes, type CustomerGeocodesFile } from '../services/customerGeocodes';
import { DEFAULT_SALES_REP } from '../lib/territoryConfig';
import { useAppAuth } from '../context/AppAuthContext';
import {
  buildFallbackColleagues,
  colleagueUrlParam,
  fetchBcSalesTeam,
  filterCustomersForColleague,
} from '../services/bcSalesTeam';
import {
  colleaguesForUser,
  isAppAdmin,
  resolveSelectedColleague,
  userSalesRepLabel,
} from '../lib/userAccess';
import {
  addFromCustomerToFunnel,
  bulkAddInactiveCustomersToFunnel,
  findFunnelByCustomerId,
  normalizeOwnerKey,
  SALES_FUNNEL_CHANGED_EVENT,
} from '../services/salesFunnelStorage';
import type { ColleagueTab } from '../types/bcSalesTeam';
import { validatePlzForUi } from '../lib/plzReconciliation';
import {
  applyEffectivePriorities,
  isPriorityOverridden,
  loadPriorityOverrides,
  PRIORITY_CHANGED_EVENT,
  setPriorityOverride,
} from '../services/customerPriorityOverrides';
import { getCustomerDetails, CUSTOMER_DETAILS_CHANGED_EVENT } from '../services/customerDetailsStorage';
import { BC_OVERLAY_CHANGED_EVENT } from '../services/customerBcOverlay';
import {
  buildPurchaseActivityMappings,
  mappingsNeedingRefresh,
  refreshBcPurchaseActivity,
  shouldRefreshPurchaseActivity,
} from '../services/bcPurchaseActivity';
import {
  countPurchaseInactive,
  formatPurchaseInactivityLabel,
  getCustomerPurchaseActivity,
  PURCHASE_INACTIVE_6M_DAYS,
  PURCHASE_INACTIVE_12M_DAYS,
  PURCHASE_INACTIVE_BANNER_KEY,
} from '../lib/customerPurchaseActivity';
import { adjustPriorityScore } from '../services/salesLearning';
import type { CustomerPrioritiesData, CustomerPriority, VisitPriority } from '../types/customerPriority';

const CustomerTerritoryMap = lazy(() =>
  import('../components/customerPriorities/CustomerTerritoryMap').then((m) => ({
    default: m.CustomerTerritoryMap,
  })),
);

type HealthFilter = 'duplicates' | 'missingEmail' | 'overdueA' | 'plzCorrected';

type ViewMode = 'list' | 'cards' | 'map';

const QUICK_CHIPS: { id: QuickFilter; label: string }[] = [
  { id: 'a', label: 'Nur A' },
  { id: 'new', label: 'Nur neue Kunden' },
  { id: 'overdue', label: 'Nur überfällig' },
  { id: 'research', label: 'Nur Recherche-Leads' },
  { id: 'week', label: 'Fällig diese Woche' },
];

const BC_QUICK_CHIPS: { id: QuickFilter; label: string }[] = [
  { id: 'inactive6m', label: '>6 Mon. kein Kauf' },
  { id: 'inactive12m', label: '>12 Mon. kein Kauf' },
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
  funnelTick,
  funnelOwnerKey,
  bcConfigured,
  detailsTick,
  allCustomers,
  geocodes,
  customRequest,
}: {
  customer: CustomerPriority;
  importPriority: VisitPriority;
  isOverridden: boolean;
  onPriorityChange: (priority: VisitPriority) => void;
  onVisitRecorded: () => void;
  pipelineTick: number;
  funnelTick: number;
  funnelOwnerKey: string;
  bcConfigured: boolean;
  detailsTick: number;
  allCustomers: CustomerPriority[];
  geocodes: CustomerGeocodesFile | null;
  customRequest?: ScheduleCustomRequest;
}) {
  void pipelineTick;
  void funnelTick;
  void detailsTick;
  const visit = getVisitState(customer.id);
  const urgency = getCustomerVisitUrgency(customer);
  const daysUntil = getDaysUntilDue(visit.nextDue);
  const isNew = isNewCustomer(customer);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(visit.notes);
  const inPipeline = isInPipeline('customer', customer.id);
  const pipelineEntry = findBySource('customer', customer.id);
  const funnelDeal = findFunnelByCustomerId(funnelOwnerKey, customer.id);
  const inFunnel = !!funnelDeal;
  const purchaseActivity = getCustomerPurchaseActivity(customer, { requireBc: bcConfigured });
  const purchaseInactivityLabel = bcConfigured
    ? formatPurchaseInactivityLabel(purchaseActivity)
    : null;
  const plzIssue = customer.plzWarning
    ? { plzWarning: true, plzWarningDetail: customer.plzWarningDetail }
    : validatePlzForUi(customer.zip, customer.city, customer.country);

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

  const handleDismissNew = () => {
    dismissNewLead(customer.id);
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

  const handleFunnel = () => {
    addFromCustomerToFunnel(funnelOwnerKey, customer);
    onVisitRecorded();
  };

  return (
    <div className="p-3 rounded-xl border border-dark-500/50 hover:border-pht-500/30 transition-colors space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-dark-600 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-bold text-pht-400">{adjustPriorityScore(customer.potentialScore, customer.id, customer.sector)}</span>
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
            {customer.source === 'daily-discovery' && <Badge variant="muted">Discovery</Badge>}
            {isNew && (
              <span title="Neu – noch nicht besucht">
                <Badge variant="warning">NEU</Badge>
              </span>
            )}
            {customer.isMeatIndustry && <Badge variant="danger">Fleisch ↓</Badge>}
            {inPipeline && <Badge variant="muted">Pipeline</Badge>}
            {inFunnel && <Badge variant="muted">Funnel</Badge>}
            {purchaseActivity.level === 'inactive12m' && (
              <Badge variant="danger">12M inaktiv</Badge>
            )}
            {purchaseActivity.level === 'inactive6m' && (
              <Badge variant="warning">6M inaktiv</Badge>
            )}
            {visit.archived && <Badge variant="muted">Archiviert</Badge>}
            {customRequest && <CustomerCustomRequestBadge request={customRequest} compact />}
            {visit.scheduledVisit && (
              <ConfirmedVisitBadge scheduledVisit={visit.scheduledVisit} prominent />
            )}
            <SalesFeedbackButtons customerId={customer.id} sector={customer.sector} compact />
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {customer.zip} {customer.city}
            {plzIssue.plzWarning && (
              <span
                className="inline-flex text-amber-400"
                title={plzIssue.plzWarningDetail ?? 'PLZ/Ort-Abweichung'}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            )}
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
          {purchaseInactivityLabel && (
            <p className="text-xs text-amber-400/90 mt-1 font-medium">{purchaseInactivityLabel}</p>
          )}
          {purchaseActivity.source === 'bc' && purchaseActivity.lastPurchaseDate && (
            <p className="text-xs text-slate-600 mt-0.5">
              Letzter Kauf (BC): {purchaseActivity.lastPurchaseDate}
            </p>
          )}
          {customer.expansionNote && (
            <p className="text-xs text-emerald-400/90 mt-1">{customer.expansionNote}</p>
          )}
          {isNew && (
            <p className="text-xs text-amber-400/90 mt-1 font-medium">Neu – noch nicht besucht</p>
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
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleVisit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700 min-h-[32px]"
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          Besuch erfasst
        </button>
        <PlanInOutlookButton onPlan={() => planCustomerVisitInOutlook(customer)} />
        <CustomerScheduleProposalButton
          customer={customer}
          urgency={urgency}
          allCustomers={allCustomers}
          geocodes={geocodes}
          onSent={onVisitRecorded}
        />
        {customRequest && (
          <CustomerCustomRequestBadge request={customRequest} customer={customer} onAccepted={onVisitRecorded} />
        )}
        <VisitRelevanceToggle customerId={customer.id} sector={customer.sector} />
        <button
          type="button"
          onClick={() => setNotesOpen((o) => !o)}
          className="px-2.5 py-1.5 rounded-lg border border-dark-500 text-slate-400 text-xs hover:bg-dark-700 min-h-[32px]"
        >
          Notizen
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dark-500/60 text-slate-500 text-xs hover:bg-dark-700 hover:text-slate-300 min-h-[32px]"
          title="Nächsten Termin um ein Intervall verschieben"
        >
          <SkipForward className="w-3 h-3" />
          Überspringen
        </button>
        {inPipeline ? (
          <Link
            to="/command-center?tab=pipeline"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-pht-500/30 text-pht-300 text-xs hover:bg-pht-600/10 min-h-[32px]"
          >
            <GitBranch className="w-3 h-3" /> Pipeline
          </Link>
        ) : (
          <button
            type="button"
            onClick={handlePipeline}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dark-500/60 text-slate-500 text-xs hover:bg-dark-700 hover:text-slate-300 min-h-[32px]"
          >
            <GitBranch className="w-3 h-3" /> Pipeline
          </button>
        )}
        {inFunnel ? (
          <Link
            to={funnelDeal ? `/sales-funnel?deal=${funnelDeal.id}` : '/sales-funnel'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 text-xs hover:bg-emerald-600/10 min-h-[32px]"
          >
            <GitBranch className="w-3 h-3" /> Funnel
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleFunnel}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dark-500/60 text-slate-500 text-xs hover:bg-dark-700 hover:text-slate-300 min-h-[32px]"
          >
            <GitBranch className="w-3 h-3" /> Funnel
          </button>
        )}
        {isNew && (
          <button
            type="button"
            onClick={handleDismissNew}
            className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-400/80 text-xs hover:bg-amber-500/10 min-h-[32px]"
            title="NEU-Markierung entfernen"
          >
            NEU entfernen
          </button>
        )}
        <button
          type="button"
          onClick={handleArchive}
          className="px-2.5 py-1.5 rounded-lg text-slate-600 text-xs hover:text-slate-400 min-h-[32px]"
          title="Nicht mehr relevant"
        >
          Archivieren
        </button>
        {customer.researchUrl && (
          <a
            href={customer.researchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 text-xs hover:text-slate-400 min-h-[32px]"
            title="Quelle öffnen"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {pipelineEntry?.notes && (
          <span className="text-[10px] text-slate-600 self-center">{pipelineEntry.notes}</span>
        )}
      </div>
      <p className="text-[10px] text-slate-600 -mt-0.5">
        Besuchsrhythmus: {VISIT_CADENCE_LABEL[customer.priority]}
      </p>
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
      <CustomerOutreachActions customer={customer} urgency={urgency} />
      <details className="group">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300 select-none py-1">
          Stammdaten &amp; BC-Dokumente
        </summary>
        <div className="pt-2 space-y-2 border-t border-dark-600/30 mt-1">
          <CustomerStammdatenForm customerId={customer.id} customerName={customer.name} />
          <CustomerBcDocumentsTab
            customerNumber={customer.customerNumber}
            bcCustomerNumber={getCustomerDetails(customer.id).bcCustomerNumber}
          />
        </div>
      </details>
    </div>
  );
}

export function CustomerPrioritiesPage() {
  const { isMobileView } = useViewMode();
  const { user } = useAppAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<CustomerPrioritiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [colleagues, setColleagues] = useState<ColleagueTab[]>([]);
  const [bcConfigured, setBcConfigured] = useState(false);
  const [teamLoading, setTeamLoading] = useState(true);
  const [visitTick, setVisitTick] = useState(0);
  const [priorityTick, setPriorityTick] = useState(0);
  const [pipelineTick, setPipelineTick] = useState(0);
  const [funnelTick, setFunnelTick] = useState(0);
  const [detailsTick, setDetailsTick] = useState(0);
  const [purchaseBannerDismissed, setPurchaseBannerDismissed] = useState(
    () => localStorage.getItem(PURCHASE_INACTIVE_BANNER_KEY) === '1',
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const colleagueParam = searchParams.get('colleague');
  const [tourMessage, setTourMessage] = useState<string | null>(null);
  const [funnelBulkMessage, setFunnelBulkMessage] = useState<string | null>(null);
  const [tourLoading, setTourLoading] = useState(false);
  const [geocodes, setGeocodes] = useState<CustomerGeocodesFile | null>(null);
  const [customRequests, setCustomRequests] = useState<ScheduleCustomRequest[]>([]);
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
  const healthFilter = (searchParams.get('health') as HealthFilter | null) ?? null;
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

  const refreshVisits = useCallback(() => {
    setVisitTick((t) => t + 1);
    void fetchCustomRequests().then(setCustomRequests);
  }, []);

  useEffect(() => {
    const onVisitChange = () => refreshVisits();
    window.addEventListener(VISIT_STORE_CHANGED_EVENT, onVisitChange);
    return () => window.removeEventListener(VISIT_STORE_CHANGED_EVENT, onVisitChange);
  }, [refreshVisits]);

  const customRequestsByCustomer = useMemo(() => {
    const map = new Map<string, ScheduleCustomRequest>();
    for (const req of customRequests) {
      if (!map.has(req.customerId)) map.set(req.customerId, req);
    }
    return map;
  }, [customRequests]);

  useEffect(() => {
    void fetchCustomRequests().then(setCustomRequests);
  }, [visitTick]);

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
    void hydrateSalesDataFromSupabase();
  }, []);

  useEffect(() => {
    const reload = () => {
      void fetchCustomerPriorities().then((d) => {
        if (d) setData(d);
      });
    };
    window.addEventListener(BC_OVERLAY_CHANGED_EVENT, reload);
    return () => window.removeEventListener(BC_OVERLAY_CHANGED_EVENT, reload);
  }, []);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setTeamLoading(true);
    void (async () => {
      try {
        const team = await fetchBcSalesTeam();
        if (cancelled) return;
        setBcConfigured(team.configured);
        if (team.configured && team.salespeople.length > 0) {
          setColleagues(team.salespeople);
        } else {
          setColleagues(buildFallbackColleagues(data.customers, userSalesRepLabel(user) ?? DEFAULT_SALES_REP));
        }
      } catch {
        if (cancelled) return;
        setBcConfigured(false);
        setColleagues(buildFallbackColleagues(data.customers, user?.name ?? DEFAULT_SALES_REP));
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [data, user?.name, user?.salesRep, user?.bcSalespersonCode]);

  const visibleColleagues = useMemo(
    () => colleaguesForUser(colleagues, user),
    [colleagues, user],
  );

  const selectedColleague = useMemo(
    () => resolveSelectedColleague(colleagues, colleagueParam, user),
    [colleagues, colleagueParam, user],
  );

  const canSwitchColleague = isAppAdmin(user);

  const prevColleagueRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedColleague || teamLoading) return;
    const key = colleagueUrlParam(selectedColleague);
    if (!colleagueParam || colleagueParam !== key) {
      updateParams({ colleague: key, territory: null });
    }
  }, [selectedColleague, colleagueParam, teamLoading, updateParams]);

  useEffect(() => {
    if (!selectedColleague) return;
    const key = colleagueUrlParam(selectedColleague);
    if (prevColleagueRef.current === key) return;
    if (selectedColleague.bundeslaender.length > 0) {
      setBundeslandFilter([...selectedColleague.bundeslaender]);
      if (!searchParams.get('view')) setViewMode('map');
    } else if (prevColleagueRef.current != null) {
      setBundeslandFilter([]);
    }
    prevColleagueRef.current = key;
  }, [selectedColleague, setBundeslandFilter, setViewMode, searchParams]);

  useEffect(() => {
    const onPipeline = () => setPipelineTick((t) => t + 1);
    window.addEventListener(PIPELINE_CHANGED_EVENT, onPipeline);
    return () => window.removeEventListener(PIPELINE_CHANGED_EVENT, onPipeline);
  }, []);

  useEffect(() => {
    const onFunnel = () => setFunnelTick((t) => t + 1);
    window.addEventListener(SALES_FUNNEL_CHANGED_EVENT, onFunnel);
    return () => window.removeEventListener(SALES_FUNNEL_CHANGED_EVENT, onFunnel);
  }, []);

  useEffect(() => {
    const onDetails = () => setDetailsTick((t) => t + 1);
    window.addEventListener(CUSTOMER_DETAILS_CHANGED_EVENT, onDetails);
    return () => window.removeEventListener(CUSTOMER_DETAILS_CHANGED_EVENT, onDetails);
  }, []);

  const funnelOwnerKey = normalizeOwnerKey(userSalesRepLabel(user) || user?.email || 'unbekannt');

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
    if (!data || !selectedColleague) return [];
    return filterCustomersForColleague(data.customers, selectedColleague, bcConfigured);
  }, [data, selectedColleague, bcConfigured]);

  const ownerCustomers = useMemo(
    () => applyEffectivePriorities(rawOwnerCustomers, priorityOverrides),
    [rawOwnerCustomers, priorityOverrides],
  );

  useEffect(() => {
    if (!bcConfigured || ownerCustomers.length === 0) return;
    let cancelled = false;
    const mappings = buildPurchaseActivityMappings(
      ownerCustomers,
      (id) => getCustomerDetails(id).bcCustomerNumber,
    );
    const stale = mappingsNeedingRefresh(
      mappings,
      (id) => shouldRefreshPurchaseActivity(getCustomerDetails(id).bcPurchaseCheckedAt),
    );
    if (stale.length === 0) return;
    void refreshBcPurchaseActivity(stale)
      .then((merged) => {
        if (!cancelled && merged > 0) setDetailsTick((t) => t + 1);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [bcConfigured, ownerCustomers]);

  const inactive6mCount = useMemo(() => {
    void detailsTick;
    if (!bcConfigured) return 0;
    return countPurchaseInactive(ownerCustomers, PURCHASE_INACTIVE_6M_DAYS, true);
  }, [bcConfigured, ownerCustomers, detailsTick]);

  const inactive12mCount = useMemo(() => {
    void detailsTick;
    if (!bcConfigured) return 0;
    return countPurchaseInactive(ownerCustomers, PURCHASE_INACTIVE_12M_DAYS, true);
  }, [bcConfigured, ownerCustomers, detailsTick]);

  const dismissPurchaseBanner = () => {
    localStorage.setItem(PURCHASE_INACTIVE_BANNER_KEY, '1');
    setPurchaseBannerDismissed(true);
  };

  const handleBulkFunnelFromInactive = useCallback(() => {
    const { created, skipped } = bulkAddInactiveCustomersToFunnel(
      funnelOwnerKey,
      ownerCustomers,
      PURCHASE_INACTIVE_6M_DAYS,
    );
    setFunnelTick((t) => t + 1);
    if (created > 0) {
      setFunnelBulkMessage(
        `${created} Funnel-Lead${created === 1 ? '' : 's'} angelegt`
        + (skipped > 0 ? ` · ${skipped} bereits im Funnel` : ''),
      );
      setQuickFilter('inactive6m');
      setViewMode('list');
    } else if (skipped > 0) {
      setFunnelBulkMessage(`Alle ${skipped} inaktiven Kunden sind bereits im Funnel.`);
    } else {
      setFunnelBulkMessage('Keine inaktiven Kunden mit BC-Daten gefunden.');
    }
  }, [funnelOwnerKey, ownerCustomers, setQuickFilter, setViewMode]);

  const funnelBulkParam = searchParams.get('funnelBulk');
  const funnelBulkHandledRef = useRef(false);
  useEffect(() => {
    if (funnelBulkParam !== '1') {
      funnelBulkHandledRef.current = false;
      return;
    }
    if (!bcConfigured || ownerCustomers.length === 0 || funnelBulkHandledRef.current) return;
    funnelBulkHandledRef.current = true;
    handleBulkFunnelFromInactive();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('funnelBulk');
      if (!next.get('quick')) next.set('quick', 'inactive6m');
      return next;
    }, { replace: true });
  }, [bcConfigured, funnelBulkParam, handleBulkFunnelFromInactive, ownerCustomers.length, setSearchParams]);

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

  const dataHealth = useMemo(
    () => computeDataHealth(ownerCustomers, visitStore),
    [ownerCustomers, visitStore],
  );

  const duplicateIdSet = useMemo(
    () => new Set(dataHealth.duplicateGroups.flatMap((g) => g.customerIds)),
    [dataHealth],
  );

  const filteredCustomers = useMemo(() => {
    let list = filterCustomers(ownerCustomers, {
      priority: priorityFilter,
      sector: sectorFilter,
      search,
      hideMeat,
      bundeslaender: bundeslandFilter,
      quickFilter,
      store: visitStore,
      showArchived,
    });
    if (healthFilter === 'missingEmail') {
      list = customersMissingEmail(list);
    } else if (healthFilter === 'overdueA') {
      list = customersOverdueA(list, visitStore);
    } else if (healthFilter === 'plzCorrected') {
      list = list.filter((c) => c.plzCorrected);
    } else if (healthFilter === 'duplicates') {
      list = list.filter((c) => duplicateIdSet.has(c.id));
    }
    return sortByNextVisit(list, visitStore);
  }, [ownerCustomers, priorityFilter, sectorFilter, search, hideMeat, bundeslandFilter, quickFilter, visitStore, showArchived, healthFilter, duplicateIdSet]);

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

  const upcomingConfirmedVisits = useMemo(
    () => getUpcomingConfirmedVisits(ownerCustomers, visitStore, 7),
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

  const handleExportEmails = () => {
    const blLabel = bundeslandFilter.length === 1
      ? BUNDESLAND_SHORT[bundeslandFilter[0] as keyof typeof BUNDESLAND_SHORT] ?? bundeslandFilter[0]
      : bundeslandFilter.length > 1 ? 'multi' : 'alle';
    exportContactEmailsCsv(filteredCustomers, `kontakte-${blLabel}-mail-merge.csv`);
  };

  const handleTourOutlook = async () => {
    setTourLoading(true);
    setTourMessage(null);
    const result = await planTourInOutlook(filteredCustomers);
    setTourMessage(result.message);
    setTourLoading(false);
  };

  const handleHealthFilter = (issue: HealthFilter) => {
    const next = healthFilter === issue ? null : issue;
    if (next === 'overdueA') {
      updateParams({ health: next, prio: 'A', quick: 'overdue' });
    } else if (next) {
      updateParams({ health: next, quick: null, prio: null });
    } else {
      updateParams({ health: null });
    }
    setViewMode('list');
  };

  const handlePrint = () => window.print();

  if (loading || teamLoading) {
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
          <MapPin className={`${isMobileView ? 'w-6 h-6' : 'w-7 h-7'} text-pht-400`} />
          Tourenplanung
        </h1>
        <p className="text-slate-400 mt-1 text-xs sm:text-sm">
          Kunden, Besuche & Routen
          {selectedColleague ? ` · ${selectedColleague.name}` : ''}
          {' · '}Stand {new Date(data.generatedAt).toLocaleDateString('de-DE')}
        </p>
      </header>

      <div className="mb-4">
        <KpiStrip kpis={dashboardKpis} />
      </div>

      <UpcomingVisitsStrip visits={upcomingConfirmedVisits} />

      {ownerCustomers.length > 0 && viewMode !== 'map' && (
        <Card className="mb-6 print:hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Gebiet{selectedColleague ? ` · ${selectedColleague.name}` : ''}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bundesland &amp; Territorium · {formatPriorityCounts(filteredPriorityCounts)}
                {selectedColleague && selectedColleague.bundeslaender.length > 0 && (
                  <span>
                    {' · '}
                    {selectedColleague.bundeslaender
                      .map((b) => BUNDESLAND_SHORT[b as keyof typeof BUNDESLAND_SHORT] ?? b)
                      .join(', ')}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className="text-xs text-pht-300 hover:text-white shrink-0 px-2 py-1 rounded-lg border border-pht-500/30"
            >
              Vollbild-Karte
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wide">Bundesländer</p>
                <AustriaBundeslandMap
                  overview={bundeslandOverview}
                  selected={bundeslandFilter}
                  onSelect={toggleBundesland}
                />
              </div>
              <div className="min-h-[280px] lg:min-h-[320px]">
                <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wide">Territoriumskarte</p>
                <Suspense fallback={<p className="text-sm text-slate-500 py-8 text-center">Karte wird geladen…</p>}>
                  <CustomerTerritoryMap
                    customers={filteredCustomers}
                    geocodes={geocodes}
                    store={visitStore}
                    colleagueCode={selectedColleague ? colleagueUrlParam(selectedColleague) : undefined}
                    onPriorityChange={handlePriorityChange}
                    onVisitRecorded={refreshVisits}
                  />
                </Suspense>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DataHealthPanel
        customers={ownerCustomers}
        store={visitStore}
        onFilterIssue={handleHealthFilter}
      />

      {!bcConfigured && isAppAdmin(user) && (
        <div className="mb-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200/90">
          Business Central ist nicht verbunden – Kollegen-Tabs nutzen Excel-Fallback.
          {' '}
          <Link to="/settings" className="text-pht-300 hover:text-white underline">
            BC in Einstellungen einrichten
          </Link>
        </div>
      )}

      {bcConfigured && colleagues.length === 0 && (
        <div className="mb-4 p-3 rounded-xl border border-slate-600/40 bg-slate-800/30 text-xs text-slate-400">
          Keine Verkäufer in Business Central gefunden. Verkäufer-Codes unter Kunden in BC pflegen.
        </div>
      )}

      {selectedColleague && ownerCustomers.length === 0 && (
        <div className="mb-4 p-3 rounded-xl border border-slate-600/40 bg-slate-800/30 text-xs text-slate-400">
          Für {selectedColleague.name} sind noch keine Kunden zugeordnet
          {bcConfigured ? ' (BC-Verkäufercode am Kunden prüfen).' : '.'}
        </div>
      )}

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

      {bcConfigured && !purchaseBannerDismissed && inactive6mCount > 0 && (
        <div className="mb-4 flex items-start gap-3 p-3 rounded-xl border border-orange-500/40 bg-orange-500/10 print:hidden">
          <Bell className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-200">
              {inactive6mCount} Kunden ohne Kauf seit über 6 Monaten
              {inactive12mCount > 0 && ` (${inactive12mCount} davon >12 Mon.)`}
            </p>
            <p className="text-xs text-orange-400/80 mt-0.5">
              Basierend auf letzten Verkaufsrechnungen in Business Central – Nachfassen oder Funnel-Lead anlegen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setQuickFilter('inactive6m'); setViewMode('list'); }}
            className="text-xs text-orange-300 hover:text-white shrink-0 px-2 py-1"
          >
            Anzeigen
          </button>
          <button
            type="button"
            onClick={handleBulkFunnelFromInactive}
            className="text-xs text-white bg-pht-600 hover:bg-pht-700 shrink-0 px-2.5 py-1 rounded-lg font-medium"
          >
            Funnel-Leads anlegen
          </button>
          <button type="button" onClick={dismissPurchaseBanner} className="text-slate-500 hover:text-white shrink-0" aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {funnelBulkMessage && (
        <div className="mb-4 p-3 rounded-xl border border-pht-500/30 bg-pht-600/10 text-xs text-pht-200 print:hidden flex items-center justify-between gap-2">
          <span>{funnelBulkMessage}</span>
          <div className="flex gap-2 shrink-0">
            <Link to="/sales-funnel" className="text-pht-300 hover:text-white underline">
              Zum Sales Funnel
            </Link>
            <button type="button" onClick={() => setFunnelBulkMessage(null)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {(canSwitchColleague ? visibleColleagues.length > 1 : visibleColleagues.length > 0) && (
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide print:hidden">
        {visibleColleagues.map((colleague) => {
          const param = colleagueUrlParam(colleague);
          const active = selectedColleague && colleagueUrlParam(selectedColleague) === param;
          return (
            <button
              key={param}
              type="button"
              disabled={!canSwitchColleague && !active}
              onClick={() => {
                if (!canSwitchColleague) return;
                updateParams({
                  colleague: param,
                  territory: null,
                  bl: colleague.bundeslaender.length ? colleague.bundeslaender.join(',') : null,
                  view: colleague.bundeslaender.length ? 'map' : null,
                });
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
                active
                  ? 'bg-pht-600 text-white'
                  : canSwitchColleague
                    ? 'bg-dark-700 text-slate-400 hover:text-white'
                    : 'bg-dark-800 text-slate-600 cursor-default'
              }`}
            >
              {colleague.name}
              {colleague.customerCount > 0 && (
                <span className="ml-1.5 text-[10px] opacity-70 tabular-nums">({colleague.customerCount})</span>
              )}
            </button>
          );
        })}
      </div>
      )}

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
            {bcConfigured && BC_QUICK_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickFilter(quickFilter === chip.id ? null : chip.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border transition-colors min-h-[32px] ${
                  quickFilter === chip.id
                    ? 'bg-orange-600 border-orange-500 text-white'
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
                  onClick={() => void handleTourOutlook()}
                  disabled={tourLoading || filteredCustomers.length === 0}
                  title={`Tour in Outlook (${TOUR_STOP_COUNT} Termine à 45 min, nächster Werktag 09:00)`}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-pht-500/40 text-pht-300 hover:bg-pht-600/10 min-h-[40px] disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Tour Outlook ({TOUR_STOP_COUNT})</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportEmails}
                  title="E-Mails CSV (Mail-Merge, gefiltertes Territorium)"
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-pht-500/40 text-pht-300 hover:bg-pht-600/10 min-h-[40px]"
                >
                  <Mail className="w-4 h-4" />
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
          {tourMessage && (
            <p className="text-xs text-pht-300 px-1">{tourMessage}</p>
          )}
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
              {selectedColleague
                ? `Gebiet ${selectedColleague.name}`
                : 'Karten-Modus Österreich'}
            </h2>
            <p className="text-xs text-slate-500">
              Leaflet · OSM · Kundenpunkte · Routenvorschläge ab Pitten
              {selectedColleague && selectedColleague.bundeslaender.length > 0 && (
                <span>
                  {' · '}
                  {selectedColleague.bundeslaender
                    .map((b) => BUNDESLAND_SHORT[b as keyof typeof BUNDESLAND_SHORT] ?? b)
                    .join(', ')}
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-slate-500 py-8 text-center">Interaktive Karte wird geladen…</p>}>
              <CustomerTerritoryMap
                customers={filteredCustomers}
                geocodes={geocodes}
                store={visitStore}
                colleagueCode={selectedColleague ? colleagueUrlParam(selectedColleague) : undefined}
                onPriorityChange={handlePriorityChange}
                onVisitRecorded={refreshVisits}
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
                  {selectedColleague?.name ?? 'Kunden'} · {filteredCustomers.length} Kunden
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
                  funnelTick={funnelTick}
                  funnelOwnerKey={funnelOwnerKey}
                  bcConfigured={bcConfigured}
                  detailsTick={detailsTick}
                  allCustomers={ownerCustomers}
                  geocodes={geocodes}
                  customRequest={customRequestsByCustomer.get(c.id)}
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
