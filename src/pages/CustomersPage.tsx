import { ArrowDownAZ, Building2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomerStammdatenForm } from '../components/customerPriorities/CustomerStammdatenForm';
import { useAppAuth } from '../context/AppAuthContext';
import { useViewMode } from '../context/ViewModeContext';
import { filterCustomersForAppUser } from '../lib/userAccess';
import { applyEffectivePriorities } from '../services/customerPriorityOverrides';
import { getCustomerDetails } from '../services/customerDetailsStorage';
import { allCustomerContacts } from '../types/customerDetails';
import {
  fetchCustomerPriorities,
  filterCustomers,
  resolveBundesland,
  uniqueBundeslaender,
  uniqueSectors,
} from '../services/customerVisitStorage';
import type { CustomerPriority } from '../types/customerPriority';

type SortKey = 'name' | 'zip' | 'city' | 'bundesland' | 'sector';

function sortCustomers(list: CustomerPriority[], key: SortKey): CustomerPriority[] {
  return [...list].sort((a, b) => {
    const av = key === 'bundesland' ? (resolveBundesland(a) ?? '') : String(a[key] ?? '');
    const bv = key === 'bundesland' ? (resolveBundesland(b) ?? '') : String(b[key] ?? '');
    return av.localeCompare(bv, 'de', { numeric: true, sensitivity: 'base' });
  });
}

export function CustomersPage() {
  const { user } = useAppAuth();
  const { isMobileView } = useViewMode();
  const [customers, setCustomers] = useState<CustomerPriority[]>([]);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [bundesland, setBundesland] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void fetchCustomerPriorities().then((data) => {
      if (!data) return;
      setCustomers(filterCustomersForAppUser(applyEffectivePriorities(data.customers), user));
    });
  }, [user]);

  const sectors = useMemo(() => uniqueSectors(customers), [customers]);
  const bundeslaender = useMemo(() => uniqueBundeslaender(customers), [customers]);

  const visible = useMemo(() => {
    const filtered = filterCustomers(customers, {
      search,
      sector: sector === 'all' ? undefined : sector,
      bundeslaender: bundesland === 'all' ? undefined : [bundesland],
    });
    return sortCustomers(filtered, sortKey);
  }, [bundesland, customers, search, sector, sortKey]);

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-5xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-4' : 'mb-6'}`}>
        <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
          <Building2 className={`${isMobileView ? 'w-6 h-6' : 'w-7 h-7'} text-pht-400`} />
          Kunden
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Suche und Sortierung nach Branche, PLZ und Bundesland · {visible.length} von {customers.length}
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <label className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kunde, Ort, PLZ, Bundesland, Branche…"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-800 border border-dark-500 text-sm text-white"
          />
        </label>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="px-2.5 py-2 rounded-lg bg-dark-800 border border-dark-500 text-sm text-white"
        >
          <option value="all">Alle Branchen</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select
          value={bundesland}
          onChange={(e) => setBundesland(e.target.value)}
          className="px-2.5 py-2 rounded-lg bg-dark-800 border border-dark-500 text-sm text-white"
        >
          <option value="all">Alle Bundesländer</option>
          {bundeslaender.map((b) => (
            <option key={b.name} value={b.name}>{b.name} ({b.count})</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <ArrowDownAZ className="w-3.5 h-3.5" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-2.5 py-2 rounded-lg bg-dark-800 border border-dark-500 text-sm text-white"
          >
            <option value="name">Name</option>
            <option value="zip">PLZ</option>
            <option value="city">Ort</option>
            <option value="bundesland">Bundesland</option>
            <option value="sector">Branche</option>
          </select>
        </label>
      </div>

      <ul className="space-y-2">
        {visible.map((customer) => {
          const details = getCustomerDetails(customer.id);
          const people = allCustomerContacts(details).filter((c) => c.name || c.email);
          const open = openId === customer.id;
          return (
            <li key={customer.id} className="rounded-xl border border-dark-500/60 bg-dark-800/50">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : customer.id)}
                className="w-full text-left px-3 py-2.5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-white">{customer.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {customer.zip} {customer.city}
                    {resolveBundesland(customer) ? ` · ${resolveBundesland(customer)}` : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {customer.sectorLabel}
                  {people[0]?.name ? ` · ${people[0].name}` : ''}
                  {people.length > 1 ? ` · +${people.length - 1} Ansprechpartner` : ''}
                </p>
              </button>
              {open && (
                <div className="px-3 pb-3 space-y-2 border-t border-dark-600/50">
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link
                      to={`/priorities?q=${encodeURIComponent(customer.name)}`}
                      className="text-xs text-pht-400 hover:text-pht-300"
                    >
                      In Tourenplanung
                    </Link>
                    <Link
                      to={`/sales-funnel?customer=${encodeURIComponent(customer.id)}`}
                      className="text-xs text-pht-400 hover:text-pht-300"
                    >
                      Zum Funnel
                    </Link>
                  </div>
                  <CustomerStammdatenForm customerId={customer.id} customerName={customer.name} defaultOpen />
                </div>
              )}
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="text-sm text-slate-500 py-8 text-center">Keine Kunden für diese Filter.</li>
        )}
      </ul>
    </div>
  );
}
