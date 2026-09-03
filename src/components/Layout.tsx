import {
  BarChart3, Crown, Globe, Globe2, MapPin, Menu, Settings, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import {
  countUpcomingConfirmedVisits,
  fetchCustomerPriorities,
  loadVisitStore,
  migrateVisitStore,
  VISIT_STORE_CHANGED_EVENT,
} from '../services/customerVisitStorage';
import { applyEffectivePriorities } from '../services/customerPriorityOverrides';
import { useAssistant } from '../context/AssistantContext';
import { useAppAuth } from '../context/AppAuthContext';
import { useViewMode } from '../context/ViewModeContext';
import { isAppAdmin, userSalesRepLabel } from '../lib/userAccess';
import { AssistantFAB, AssistantPanel } from './AssistantPanel';
import { AppHeader } from './AppHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreSheet } from './MobileMoreSheet';
import { FastModeBanner } from './FastModeBanner';
import { TenderDrawer } from './TenderDrawer';

const primaryNavItems = [
  { to: '/priorities', label: 'Tourenplanung', icon: MapPin },
  { to: '/command-center', label: 'Command Center', icon: Crown },
  { to: '/opportunities', label: 'Opportunities', icon: Globe2, adminOnly: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  { to: '/settings', label: 'Einstellungen', icon: Settings, adminOnly: true },
];

const backgroundNavItems = [
  { to: '/tenders', label: 'Ausschreibungen', icon: Globe },
  { to: '/coverage', label: 'Abdeckung', icon: Globe2 },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, configured } = useAppAuth();
  const showAdminNav = !configured || isAppAdmin(user);
  const { reminders, stats, loading } = useTenders();
  const urgentCount = reminders.filter((r) => r.urgency === 'critical' || r.urgency === 'high').length;
  const [upcomingVisitCount, setUpcomingVisitCount] = useState(0);

  useEffect(() => {
    const owner = userSalesRepLabel(user) ?? 'Dominik Weller';
    const refresh = () => {
      void fetchCustomerPriorities().then((data) => {
        if (!data) return;
        const customers = applyEffectivePriorities(
          data.customers.filter((c) => c.owner === owner || c.salesRep === owner),
        );
        migrateVisitStore(customers);
        setUpcomingVisitCount(countUpcomingConfirmedVisits(customers, loadVisitStore(), 7));
      });
    };
    refresh();
    window.addEventListener(VISIT_STORE_CHANGED_EVENT, refresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pht_customer_visit_state_v1') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(VISIT_STORE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [user]);

  const visiblePrimaryNav = primaryNavItems.filter((item) => showAdminNav || !item.adminOnly);

  return (
    <>
      <div className="p-5 border-b border-dark-500/50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pht-500 to-pht-700 flex items-center justify-center text-white font-bold text-sm">P</div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">PHT Intelligence</h1>
            <p className="text-[10px] text-slate-500">Vertriebstool · Ostösterreich</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visiblePrimaryNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-pht-600/20 text-pht-400 border border-pht-500/30'
                  : 'text-slate-400 hover:bg-dark-600/50 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {label === 'Tourenplanung' && upcomingVisitCount > 0 && (
              <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 flex items-center justify-center tabular-nums">
                {upcomingVisitCount}
              </span>
            )}
          </NavLink>
        ))}
        {showAdminNav && (
        <>
        <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider text-slate-600">Hintergrund</p>
        {backgroundNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-dark-600/40 text-slate-300 border border-dark-500/40'
                  : 'text-slate-600 hover:bg-dark-600/30 hover:text-slate-400'
              }`
            }
          >
            <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
            {label}
          </NavLink>
        ))}
        </>
        )}
      </nav>

      <div className="m-3 space-y-2">
        {showAdminNav && urgentCount > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
              {urgentCount} dringende Frist{urgentCount > 1 ? 'en' : ''}
            </div>
          </div>
        )}
        {showAdminNav && (
        <div className="p-3 rounded-lg bg-dark-700/50 border border-dark-500/30 text-xs text-slate-500 space-y-1">
          <Link to="/tenders" className="flex justify-between hover:text-pht-400 transition-colors">
            <span>Treffer</span><span className="text-slate-300">{loading ? '…' : stats.total}</span>
          </Link>
          <Link to="/tenders?score=60" className="flex justify-between hover:text-pht-400 transition-colors">
            <span>Score ≥60</span><span className="text-emerald-400">{loading ? '…' : stats.highScoreCount}</span>
          </Link>
          <Link to="/tenders" className="flex justify-between hover:text-pht-400 transition-colors">
            <span>Ausgeblendet (&lt;14T)</span><span className="text-slate-400">{loading ? '…' : stats.hiddenByLeadDays}</span>
          </Link>
        </div>
        )}
      </div>

      <div className="p-4 border-t border-dark-500/50 text-[10px] text-slate-600 space-y-1">
        <p>v5.0 Tourenplanung · DACH+SEE</p>
        <Link to="/datenschutz" className="text-slate-500 hover:text-pht-400 transition-colors">
          Datenschutz
        </Link>
      </div>
    </>
  );
}

export function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const { open: assistantOpen, openAssistant, closeAssistant } = useAssistant();
  const { isNarrowScreen } = useViewMode();
  const { user, configured } = useAppAuth();
  const showAdminNav = !configured || isAppAdmin(user);

  return (
    <div className="min-h-screen flex bg-dark-900">
      <aside className="hidden lg:flex w-64 bg-dark-800 border-r border-dark-500/50 flex-col shrink-0">
        <Sidebar />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] h-full bg-dark-800 flex flex-col shadow-xl">
            <button type="button" onClick={() => setMobileNavOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-3 py-2.5 border-b border-dark-500/50 bg-dark-800/95 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="p-2.5 rounded-lg text-slate-400 hover:bg-dark-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Menü öffnen"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pht-500 to-pht-700 flex items-center justify-center text-white font-bold text-xs shrink-0">P</div>
            <span className="text-sm font-semibold text-white truncate">PHT Intelligence</span>
          </div>
        </div>
        <AppHeader />
        <FastModeBanner />
        <main className={`flex-1 overflow-auto bg-dark-900 ${isNarrowScreen ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]' : ''}`}>
          <Outlet />
        </main>
      </div>

      {showAdminNav && <TenderDrawer />}

      {isNarrowScreen && (
        <>
          <MobileBottomNav adminNav={showAdminNav} onMoreClick={() => setMoreSheetOpen(true)} />
          {showAdminNav && (
            <MobileMoreSheet open={moreSheetOpen} onClose={() => setMoreSheetOpen(false)} />
          )}
        </>
      )}

      {!isNarrowScreen && <AssistantFAB onClick={openAssistant} />}
      <AssistantPanel open={assistantOpen} onClose={closeAssistant} />
    </div>
  );
}
