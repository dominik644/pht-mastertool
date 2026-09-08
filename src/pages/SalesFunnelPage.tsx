import { GitBranch, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';
import { DEFAULT_SALES_REP } from '../lib/territoryConfig';
import {
  colleaguesForUser,
  filterCustomersForAppUser,
  isAppAdmin,
  resolveSelectedColleague,
  userSalesRepLabel,
} from '../lib/userAccess';
import {
  addFromCustomerToFunnel,
  findFunnelByCustomerId,
  findFunnelDeal,
  funnelOwnerKeyForUser,
  importExcelFunnels,
  normalizeOwnerKey,
} from '../services/salesFunnelStorage';
import { fetchCustomerPriorities } from '../services/customerVisitStorage';
import {
  buildFallbackColleagues,
  colleagueUrlParam,
  fetchBcSalesTeam,
  filterCustomersForColleague,
  findColleagueByParam,
  KNOWN_SALES_COLLEAGUES,
  mergeColleagueLists,
} from '../services/bcSalesTeam';
import { SalesFunnelAddDealDialog } from '../components/salesFunnel/SalesFunnelAddDealDialog';
import { SalesFunnelBoard, useFunnelDealsRefresh } from '../components/salesFunnel/SalesFunnelBoard';
import { useViewMode } from '../context/ViewModeContext';
import type { ColleagueTab } from '../types/bcSalesTeam';
import type { CustomerPrioritiesData } from '../types/customerPriority';

const ALL_COLLEAGUES = 'all';

export function SalesFunnelPage() {
  const { user } = useAppAuth();
  const { isMobileView } = useViewMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const admin = isAppAdmin(user);
  const ownKey = funnelOwnerKeyForUser(user);
  const [allDeals, refresh] = useFunnelDealsRefresh();
  const [seeding, setSeeding] = useState(false);
  const [seedNote, setSeedNote] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerPrioritiesData | null>(null);
  const [colleagues, setColleagues] = useState<ColleagueTab[]>(() => KNOWN_SALES_COLLEAGUES);
  const [bcConfigured, setBcConfigured] = useState(false);
  const customerParam = searchParams.get('customer');
  const dealParam = searchParams.get('deal');
  const colleagueParam = searchParams.get('colleague');

  useEffect(() => {
    void fetchCustomerPriorities().then(setCustomerData);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const customers = customerData?.customers ?? [];
      try {
        const team = await fetchBcSalesTeam();
        if (cancelled) return;
        setBcConfigured(Boolean(team.configured) && team.salespeople.length > 0);
        setColleagues(mergeColleagueLists(
          KNOWN_SALES_COLLEAGUES,
          team.salespeople,
          customers.length ? buildFallbackColleagues(customers, userSalesRepLabel(user) ?? DEFAULT_SALES_REP) : [],
        ));
      } catch {
        if (cancelled) return;
        setBcConfigured(false);
        setColleagues(mergeColleagueLists(
          KNOWN_SALES_COLLEAGUES,
          customers.length ? buildFallbackColleagues(customers, user?.name ?? DEFAULT_SALES_REP) : [],
        ));
      }
    })();
    return () => { cancelled = true; };
  }, [customerData, user?.name, user?.salesRep, user?.bcSalespersonCode]);

  const visibleColleagues = useMemo(
    () => (user ? colleaguesForUser(colleagues, user) : []),
    [colleagues, user],
  );

  const selectedColleague = useMemo(() => {
    if (!admin) return resolveSelectedColleague(colleagues, colleagueParam, user);
    if (!colleagueParam || colleagueParam === ALL_COLLEAGUES) return null;
    return findColleagueByParam(visibleColleagues, colleagueParam);
  }, [admin, colleagueParam, colleagues, user, visibleColleagues]);

  const activeOwnerKey = selectedColleague
    ? normalizeOwnerKey(selectedColleague.name)
    : ownKey;

  const ensureSeed = useCallback(async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const result = await importExcelFunnels({ admin, ownKey });
      refresh();
      if (result.added > 0) {
        setSeedNote(`${result.added} Deals aus den Excel-Funnels der Kollegen eingespielt.`);
      } else if (result.owners.length > 0) {
        setSeedNote(admin
          ? `Excel-Funnels der Kollegen sind geladen (${result.owners.length} Vertriebler).`
          : 'Ihr Excel-Funnel ist geladen.');
      } else {
        setSeedNote('Keine Excel-Funnels gefunden.');
      }
    } finally {
      setSeeding(false);
    }
  }, [admin, ownKey, refresh, user]);

  useEffect(() => {
    if (!user) return;
    void ensureSeed();
  }, [ensureSeed, user]);

  const allCustomers = customerData?.customers ?? [];
  const appCustomers = useMemo(
    () => filterCustomersForAppUser(allCustomers, user),
    [allCustomers, user],
  );

  const dialogCustomers = useMemo(() => {
    if (admin && selectedColleague) {
      return filterCustomersForColleague(allCustomers, selectedColleague, bcConfigured);
    }
    return appCustomers;
  }, [admin, allCustomers, appCustomers, bcConfigured, selectedColleague]);

  useEffect(() => {
    if (!customerParam || !user) return;
    const customer = dialogCustomers.find((c) => c.id === customerParam)
      ?? appCustomers.find((c) => c.id === customerParam);
    if (!customer) return;

    const existing = findFunnelByCustomerId(activeOwnerKey, customer.id);
    if (existing) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('customer');
        next.set('deal', existing.id);
        return next;
      }, { replace: true });
      return;
    }

    if (!admin) {
      addFromCustomerToFunnel(activeOwnerKey, customer);
      refresh();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('customer');
        return next;
      }, { replace: true });
    } else {
      setAddOpen(true);
    }
  }, [activeOwnerKey, admin, appCustomers, customerParam, dialogCustomers, refresh, setSearchParams, user]);

  const visibleDeals = useMemo(() => {
    if (!admin) {
      return allDeals.filter((d) => normalizeOwnerKey(d.ownerKey) === ownKey);
    }
    if (selectedColleague) {
      const key = normalizeOwnerKey(selectedColleague.name);
      return allDeals.filter((d) => normalizeOwnerKey(d.ownerKey) === key);
    }
    return allDeals;
  }, [admin, allDeals, ownKey, selectedColleague]);

  const initialDealId = useMemo(() => {
    if (!dealParam) return null;
    const deal = findFunnelDeal(dealParam);
    if (!deal) return null;
    if (!admin && normalizeOwnerKey(deal.ownerKey) !== ownKey) return null;
    return deal.id;
  }, [admin, dealParam, ownKey]);

  const setColleagueFilter = (param: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (param === ALL_COLLEAGUES) next.delete('colleague');
      else next.set('colleague', param);
      return next;
    }, { replace: true });
  };

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-7xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-4' : 'mb-6'} flex flex-wrap items-start justify-between gap-3`}>
        <div>
          <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
            <GitBranch className="w-7 h-7 text-pht-400" />
            Sales Funnel
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {admin
              ? selectedColleague
                ? `CRM · ${selectedColleague.name}`
                : `CRM · Alle Kollegen · ${allDeals.length} Deals`
              : `Ihr CRM-Funnel · ${user?.name ?? ownKey}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void ensureSeed()}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dark-500 text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            {admin ? 'Kollegen-Excel einspielen' : 'Excel-Funnel laden'}
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Lead / Deal
          </button>
        </div>
      </header>

      {visibleColleagues.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {admin && (
            <button
              type="button"
              onClick={() => setColleagueFilter(ALL_COLLEAGUES)}
              className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
                !selectedColleague ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
              }`}
            >
              Alle
              <span className="ml-1.5 text-[10px] opacity-70">{allDeals.length}</span>
            </button>
          )}
          {visibleColleagues.map((colleague) => {
            const param = colleagueUrlParam(colleague);
            const active = selectedColleague && colleagueUrlParam(selectedColleague) === param;
            const dealCount = allDeals.filter(
              (d) => normalizeOwnerKey(d.ownerKey) === normalizeOwnerKey(colleague.name),
            ).length;
            return (
              <button
                key={param}
                type="button"
                disabled={!admin}
                onClick={() => {
                  if (!admin) return;
                  setColleagueFilter(param);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
                  active
                    ? 'bg-pht-600 text-white'
                    : admin
                      ? 'bg-dark-700 text-slate-400 hover:text-white'
                      : 'bg-pht-600 text-white cursor-default'
                }`}
              >
                {colleague.name}
                <span className="ml-1.5 text-[10px] opacity-70">{dealCount}</span>
              </button>
            );
          })}
        </div>
      )}

      {seedNote && (
        <p className="mb-4 text-xs text-slate-500">{seedNote}</p>
      )}

      <SalesFunnelBoard
        deals={visibleDeals}
        readOnly={false}
        showOwner={admin && !selectedColleague}
        onChanged={refresh}
        initialDealId={initialDealId}
      />

      <SalesFunnelAddDealDialog
        open={addOpen}
        ownerKey={activeOwnerKey}
        customers={dialogCustomers}
        preselectedCustomerId={customerParam}
        onClose={() => {
          setAddOpen(false);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('customer');
            return next;
          }, { replace: true });
        }}
        onCreated={refresh}
      />
    </div>
  );
}
