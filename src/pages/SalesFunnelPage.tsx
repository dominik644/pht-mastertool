import { GitBranch, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';
import { filterCustomersForAppUser, isAppAdmin, userSalesRepLabel } from '../lib/userAccess';
import {
  addFromCustomerToFunnel,
  aggregateFunnelByOwner,
  findFunnelByCustomerId,
  findFunnelDeal,
  loadFunnelSeedForOwner,
  mergeSeedDeals,
  normalizeOwnerKey,
} from '../services/salesFunnelStorage';
import { fetchCustomerPriorities } from '../services/customerVisitStorage';
import { SalesFunnelAddDealDialog } from '../components/salesFunnel/SalesFunnelAddDealDialog';
import { SalesFunnelBoard, useFunnelDealsRefresh } from '../components/salesFunnel/SalesFunnelBoard';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useViewMode } from '../context/ViewModeContext';
import type { CustomerPrioritiesData } from '../types/customerPriority';

export function SalesFunnelPage() {
  const { user } = useAppAuth();
  const { isMobileView } = useViewMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const admin = isAppAdmin(user);
  const ownerKey = normalizeOwnerKey(userSalesRepLabel(user) || user?.email || 'unbekannt');
  const [allDeals, refresh] = useFunnelDealsRefresh();
  const [seeding, setSeeding] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerPrioritiesData | null>(null);
  const customerParam = searchParams.get('customer');
  const dealParam = searchParams.get('deal');

  const ensureSeed = useCallback(async () => {
    if (!user) return;
    const existing = allDeals.filter((d) => normalizeOwnerKey(d.ownerKey) === ownerKey);
    if (existing.length > 0) return;
    setSeeding(true);
    try {
      const seed = await loadFunnelSeedForOwner(userSalesRepLabel(user) || user.name || '');
      if (seed.length) {
        mergeSeedDeals(seed, ownerKey);
        refresh();
      }
    } finally {
      setSeeding(false);
    }
  }, [allDeals, ownerKey, refresh, user]);

  useEffect(() => {
    void ensureSeed();
  }, [ensureSeed]);

  useEffect(() => {
    void fetchCustomerPriorities().then(setCustomerData);
  }, []);

  const appCustomers = useMemo(
    () => filterCustomersForAppUser(customerData?.customers ?? [], user),
    [customerData, user],
  );

  useEffect(() => {
    if (!customerParam || !user) return;
    const customer = appCustomers.find((c) => c.id === customerParam);
    if (!customer) return;

    const existing = findFunnelByCustomerId(ownerKey, customer.id);
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
      addFromCustomerToFunnel(ownerKey, customer);
      refresh();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('customer');
        return next;
      }, { replace: true });
    } else {
      setAddOpen(true);
    }
  }, [admin, appCustomers, customerParam, ownerKey, refresh, setSearchParams, user]);

  const visibleDeals = useMemo(() => {
    if (admin) {
      if (ownerFilter) {
        return allDeals.filter((d) => normalizeOwnerKey(d.ownerKey) === normalizeOwnerKey(ownerFilter));
      }
      return allDeals;
    }
    return allDeals.filter((d) => normalizeOwnerKey(d.ownerKey) === ownerKey);
  }, [admin, allDeals, ownerFilter, ownerKey]);

  const ownerMetrics = useMemo(
    () => (admin ? aggregateFunnelByOwner(allDeals) : null),
    [admin, allDeals],
  );

  const initialDealId = useMemo(() => {
    if (!dealParam) return null;
    const deal = findFunnelDeal(dealParam);
    if (!deal) return null;
    if (!admin && normalizeOwnerKey(deal.ownerKey) !== ownerKey) return null;
    return deal.id;
  }, [admin, dealParam, ownerKey]);

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
              ? 'CRM · Alle Verkäufer · Deals aus Tourenplanung & Excel'
              : `Ihr CRM-Funnel · ${user?.name ?? ownerKey}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void ensureSeed().then(refresh)}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dark-500 text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            Excel-Seed laden
          </button>
          {!admin && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Lead / Deal
            </button>
          )}
        </div>
      </header>

      {admin && ownerMetrics && ownerMetrics.size > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Kumuliert nach Verkäufer</h2>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...ownerMetrics.entries()].map(([key, m]) => (
              <button
                key={key}
                type="button"
                onClick={() => setOwnerFilter(ownerFilter === key ? null : key)}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  ownerFilter === key
                    ? 'border-pht-500/50 bg-pht-600/10'
                    : 'border-dark-500/50 bg-dark-800/40 hover:border-dark-400'
                }`}
              >
                <p className="text-sm font-medium text-white capitalize">{key}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {m.activeCount} aktiv · Forecast {(m.weightedForecast / 1000).toFixed(0)}k €
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <SalesFunnelBoard
        deals={visibleDeals}
        readOnly={false}
        showOwner={admin}
        onChanged={refresh}
        initialDealId={initialDealId}
      />

      <SalesFunnelAddDealDialog
        open={addOpen}
        ownerKey={ownerKey}
        customers={appCustomers}
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
