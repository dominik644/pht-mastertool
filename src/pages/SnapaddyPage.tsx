import { CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SnapaddyInboxPanel } from '../components/customerPriorities/SnapaddyInboxPanel';
import { SnapaddySettings } from '../components/settings/SnapaddySettings';
import { useAppAuth } from '../context/AppAuthContext';
import { useViewMode } from '../context/ViewModeContext';
import { filterCustomersForAppUser, userSalesRepLabel } from '../lib/userAccess';
import { applyEffectivePriorities } from '../services/customerPriorityOverrides';
import { fetchCustomerPriorities } from '../services/customerVisitStorage';
import type { CustomerPriority } from '../types/customerPriority';

export function SnapaddyPage() {
  const { user } = useAppAuth();
  const { isMobileView } = useViewMode();
  const [customers, setCustomers] = useState<CustomerPriority[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void fetchCustomerPriorities().then((d) => {
      if (!d) return;
      setCustomers(filterCustomersForAppUser(applyEffectivePriorities(d.customers), user));
    });
  }, [user, tick]);

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-3xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-4' : 'mb-6'}`}>
        <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
          <CreditCard className={`${isMobileView ? 'w-6 h-6' : 'w-7 h-7'} text-pht-400`} />
          Snapaddy
        </h1>
        <p className="text-slate-400 mt-1 text-xs sm:text-sm">
          Visitenkarten aus der Snapaddy-App — neuer Kunde oder Kontakt zu einem bestehenden Kunden.
        </p>
      </header>

      <SnapaddyInboxPanel
        customers={customers}
        ownerName={userSalesRepLabel(user) ?? user?.name ?? 'Vertrieb'}
        onApplied={() => setTick((t) => t + 1)}
      />

      <div className="mt-6">
        <SnapaddySettings />
      </div>
    </div>
  );
}
