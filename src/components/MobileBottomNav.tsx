import {
  Bot, Crown, Globe, LayoutDashboard, Menu, Star,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAssistant } from '../context/AssistantContext';

const primaryTabs = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tenders', label: 'Ausschreibungen', icon: Globe },
  { to: '/command', label: 'Command', icon: Crown },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
];

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const location = useLocation();
  const { openAssistant } = useAssistant();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-dark-500/60 bg-dark-800/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Hauptnavigation"
    >
      <div className="flex items-stretch justify-around px-1 pt-1">
        {primaryTabs.map(({ to, label, icon: Icon, end }) => {
          const active = end ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 px-1 min-h-[52px] rounded-lg transition-colors ${
                active ? 'text-pht-400' : 'text-slate-500 active:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-pht-400' : ''}`} />
              <span className="text-[10px] font-medium truncate max-w-full">{label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={openAssistant}
          className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 px-1 min-h-[52px] rounded-lg text-violet-400 active:text-violet-300"
          aria-label="SOPHIE öffnen"
        >
          <Bot className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-medium">SOPHIE</span>
        </button>
        <button
          type="button"
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 px-1 min-h-[52px] rounded-lg text-slate-500 active:text-slate-300"
          aria-label="Weitere Menüpunkte"
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-medium">Mehr</span>
        </button>
      </div>
    </nav>
  );
}
