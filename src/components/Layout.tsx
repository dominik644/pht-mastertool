import {
  LayoutDashboard, Star, Bell, GitBranch, Globe, CheckCircle, AlertTriangle,
  BarChart3, GitCompare, UserCog, Menu, X, Calendar, CheckSquare,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import { AppHeader } from './AppHeader';
import { TenderDrawer } from './TenderDrawer';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenders', label: 'Suche', icon: Globe },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/calendar', label: 'Kalender', icon: Calendar },
  { to: '/todo', label: 'To Do', icon: CheckSquare },
  { to: '/go-no-go', label: 'Go/No-Go', icon: CheckCircle },
  { to: '/alerts', label: 'Alerts & Reminder', icon: AlertTriangle },
  { to: '/analytics', label: 'KPIs & Analytics', icon: BarChart3 },
  { to: '/similarity', label: 'Ähnlichkeiten', icon: GitCompare },
  { to: '/profiles', label: 'Profile & Scoring', icon: UserCog },
  { to: '/workflow', label: 'Workflow', icon: GitBranch },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { reminders, stats, loading } = useTenders();
  const urgentCount = reminders.filter((r) => r.urgency === 'critical' || r.urgency === 'high').length;

  return (
    <>
      <div className="p-5 border-b border-dark-500/50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pht-500 to-pht-700 flex items-center justify-center text-white font-bold text-sm">P</div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">PHT Intelligence</h1>
            <p className="text-[10px] text-slate-500">Procurement & Sales Engine</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 space-y-2">
        {urgentCount > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
              <Bell className="w-3.5 h-3.5" />
              {urgentCount} dringende Frist{urgentCount > 1 ? 'en' : ''}
            </div>
          </div>
        )}
        <div className="p-3 rounded-lg bg-dark-700/50 border border-dark-500/30 text-xs text-slate-500 space-y-1">
          <Link to="/tenders" className="flex justify-between hover:text-pht-400 transition-colors">
            <span>Treffer</span><span className="text-slate-300">{loading ? '…' : stats.total}</span>
          </Link>
          <Link to="/tenders?score=60" className="flex justify-between hover:text-pht-400 transition-colors">
            <span>Score ≥60</span><span className="text-emerald-400">{loading ? '…' : stats.highScoreCount}</span>
          </Link>
          <Link to="/calendar?filter=urgent" className="flex justify-between hover:text-pht-400 transition-colors">
            <span>Fristen &lt;14T</span><span className="text-red-400">{loading ? '…' : stats.deadlinesUnder14}</span>
          </Link>
        </div>
      </div>

      <div className="p-4 border-t border-dark-500/50 text-[10px] text-slate-600">
        v3.0 · EU · DACH · UK · Afrika · ME
      </div>
    </>
  );
}

export function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-dark-900">
      <aside className="hidden lg:flex w-64 bg-dark-800 border-r border-dark-500/50 flex-col shrink-0">
        <Sidebar />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] h-full bg-dark-800 flex flex-col shadow-xl">
            <button type="button" onClick={() => setMobileNavOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-dark-500/50 bg-dark-800">
          <button type="button" onClick={() => setMobileNavOpen(true)} className="p-2 rounded-lg text-slate-400 hover:bg-dark-600">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-white">PHT Intelligence</span>
        </div>
        <AppHeader />
        <main className="flex-1 overflow-auto bg-dark-900">
          <Outlet />
        </main>
      </div>

      <TenderDrawer />
    </div>
  );
}
