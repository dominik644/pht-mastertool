import {
  LayoutDashboard, Star, Bell, GitBranch, Globe, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenders', label: 'Globale Suche', icon: Globe },
  { to: '/go-no-go', label: 'GO / NO-GO', icon: CheckCircle },
  { to: '/workflow', label: 'Workflow', icon: GitBranch },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
];

export function Layout() {
  const { reminders, stats, loading } = useTenders();
  const urgentCount = reminders.filter((r) => r.urgency === 'critical' || r.urgency === 'high').length;

  return (
    <div className="min-h-screen flex bg-dark-900">
      <aside className="w-64 bg-dark-800 border-r border-dark-500/50 flex flex-col shrink-0">
        <div className="p-6 border-b border-dark-500/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pht-500 to-pht-700 flex items-center justify-center text-white font-bold text-sm">P</div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">PHT Intelligence</h1>
              <p className="text-[10px] text-slate-500">Procurement Engine</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-pht-600/20 text-pht-400 border border-pht-500/30'
                    : 'text-slate-400 hover:bg-dark-600/50 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4" />
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
          <div className="p-3 rounded-lg bg-dark-700/50 border border-dark-500/30 text-xs text-slate-500">
            <div className="flex justify-between"><span>Treffer</span><span className="text-slate-300">{loading ? '…' : stats.total}</span></div>
            <div className="flex justify-between mt-1"><span>Score ≥60</span><span className="text-emerald-400">{loading ? '…' : stats.highScoreCount}</span></div>
          </div>
        </div>

        <div className="p-4 border-t border-dark-500/50 text-[10px] text-slate-600">
          v2.0 · Global · ohne USA
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-dark-900">
        <Outlet />
      </main>
    </div>
  );
}
