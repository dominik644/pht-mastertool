import {
  BarChart3, Bell, Calculator, Calendar, CheckCircle, CheckSquare, GitBranch, GitCompare,
  Globe2, Trophy, UserCog, X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const moreItems = [
  { to: '/plan', label: 'Marktführer-Plan', icon: Trophy },
  { to: '/coverage', label: 'Länder-Abdeckung', icon: Globe2 },
  { to: '/calendar', label: 'Kalender', icon: Calendar },
  { to: '/todo', label: 'To Do', icon: CheckSquare },
  { to: '/go-no-go', label: 'Go/No-Go', icon: CheckCircle },
  { to: '/alerts', label: 'Alerts & Reminder', icon: Bell },
  { to: '/analytics', label: 'KPIs & Analytics', icon: BarChart3 },
  { to: '/similarity', label: 'Ähnlichkeiten', icon: GitCompare },
  { to: '/profiles', label: 'Profile & Scoring', icon: UserCog },
  { to: '/workflow', label: 'Workflow', icon: GitBranch },
  { to: '/quote', label: 'Angebotsrechner', icon: Calculator },
  { to: '/datenschutz', label: 'Datenschutz', icon: CheckCircle },
];

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMoreSheet({ open, onClose }: MobileMoreSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Schließen" />
      <div
        className="absolute bottom-0 inset-x-0 max-h-[75vh] bg-dark-800 rounded-t-2xl border-t border-dark-500/60 flex flex-col shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-500/50 shrink-0">
          <h2 className="text-sm font-semibold text-white">Weitere Bereiche</h2>
          <button type="button" onClick={onClose} className="p-2 -mr-2 text-slate-400 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2">
          {moreItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-xl min-h-[52px] text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-pht-600/20 text-pht-400 border border-pht-500/30'
                    : 'bg-dark-700/50 text-slate-300 border border-dark-500/40 active:bg-dark-600'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="line-clamp-2 leading-tight">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
