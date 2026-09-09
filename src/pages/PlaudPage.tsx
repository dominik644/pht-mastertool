import { Mic } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlaudInboxPanel } from '../components/plaud/PlaudInboxPanel';
import { useAppAuth } from '../context/AppAuthContext';
import { useViewMode } from '../context/ViewModeContext';
import { filterCustomersForAppUser } from '../lib/userAccess';
import { applyEffectivePriorities } from '../services/customerPriorityOverrides';
import { fetchCustomerPriorities } from '../services/customerVisitStorage';
import type { CustomerPriority } from '../types/customerPriority';

export function PlaudPage() {
  const { user } = useAppAuth();
  const { isMobileView } = useViewMode();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('note');
  const [customers, setCustomers] = useState<CustomerPriority[]>([]);

  useEffect(() => {
    void fetchCustomerPriorities().then((data) => {
      if (!data) return;
      setCustomers(filterCustomersForAppUser(applyEffectivePriorities(data.customers), user));
    });
  }, [user]);

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-3xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-4' : 'mb-6'}`}>
        <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
          <Mic className={`${isMobileView ? 'w-6 h-6' : 'w-7 h-7'} text-pht-400`} />
          Plaud Note
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Kostenloser Abruf vom Plaud-Konto — ohne Zapier.
        </p>
      </header>

      <PlaudInboxPanel focusId={focusId} customers={customers} />
    </div>
  );
}
