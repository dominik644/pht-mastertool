import { useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToolCalendar } from '../components/calendar/ToolCalendar';
import { useAppAuth } from '../context/AppAuthContext';
import { useTenders } from '../context/TenderContext';
import { useViewMode } from '../context/ViewModeContext';
import { applyEffectivePriorities } from '../services/customerPriorityOverrides';
import { fetchCustomerPriorities, migrateVisitStore } from '../services/customerVisitStorage';
import { filterCustomersForAppUser, isAppAdmin } from '../lib/userAccess';
import type { CustomerPriority } from '../types/customerPriority';

export function CalendarPage() {
  const { isMobileView } = useViewMode();
  const { allTenders, excludeTender } = useTenders();
  const { user } = useAppAuth();
  const includeTenders = isAppAdmin(user);
  const [customers, setCustomers] = useState<CustomerPriority[]>([]);

  useEffect(() => {
    void fetchCustomerPriorities().then((data) => {
      if (!data) return;
      const scoped = filterCustomersForAppUser(applyEffectivePriorities(data.customers), user);
      migrateVisitStore(scoped);
      setCustomers(scoped);
    });
  }, [user]);

  return (
    <div className={isMobileView ? 'p-4' : 'p-6 lg:p-8 max-w-6xl mx-auto'}>
      <ErrorBoundary resetLabel="Kalender neu laden">
        <ToolCalendar
          customers={customers}
          tenders={allTenders}
          includeTenders={includeTenders}
          compact={isMobileView}
          excludeTender={excludeTender}
        />
      </ErrorBoundary>
    </div>
  );
}
