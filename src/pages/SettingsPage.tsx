import {
  Calculator, Crown, Database, GitBranch, Shield, UserCog, Users,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import { AppUsersSettings } from '../components/AppUsersSettings';
import { BusinessCentralSettings } from '../components/BusinessCentralSettings';
import { GoLiveChecklist } from '../components/GoLiveChecklist';
import { ProductRoadmapCard } from '../components/ProductRoadmapCard';
import { CloudOperationsBanner } from '../components/CloudOperationsBanner';
import { Card, CardContent } from '../components/ui/Card';

const links = [
  { to: '/profiles', label: 'Profile & Scoring', desc: 'Produktprofile und Bewertungslogik', icon: UserCog },
  { to: '/workflow', label: 'Workflow-Kanban', desc: 'Ausschreibungen im Vertriebsprozess', icon: GitBranch },
  { to: '/quote', label: 'Angebotsrechner', desc: 'Kalkulation und Preislisten', icon: Calculator },
  { to: '/command-center?tab=plan', label: 'Marktführer-Plan', desc: '12-Monats-Ziele und Meilensteine', icon: Crown },
  { to: '/coverage#supabase', label: 'Supabase & Datenbank', desc: 'Zentrale Tender-DB und Pipeline-Sync', icon: Database },
  { to: '/datenschutz', label: 'Datenschutz', desc: 'Hinweise zur lokalen Datenverarbeitung', icon: Shield },
];

const tabs = [
  { id: 'general', label: 'Allgemein' },
  { id: 'users', label: 'Zugänge' },
] as const;

export function SettingsPage() {
  const { isMobileView } = useViewMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'users' ? 'users' : 'general';

  const setTab = (id: typeof tabs[number]['id']) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'general') next.delete('tab');
    else next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-4xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-5' : 'mb-8'}`}>
        <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white`}>Einstellungen</h1>
        <p className="text-slate-400 mt-1 text-sm">Tourenplanung, Integrationen, Zugänge und Datenschutz</p>
      </header>

      <div className="flex gap-1 mb-6 border-b border-dark-500/50">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-pht-accent text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {id === 'users' ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {label}
              </span>
            ) : label}
          </button>
        ))}
      </div>

      {activeTab === 'users' ? (
        <AppUsersSettings />
      ) : (
        <>
          <div className="mb-6">
            <GoLiveChecklist />
          </div>

          <div className="mb-6">
            <ProductRoadmapCard />
          </div>

          <CloudOperationsBanner />

          <div className="mb-6">
            <BusinessCentralSettings />
          </div>

          <div className="space-y-3">
            {links.map(({ to, label, desc, icon: Icon }) => (
              <Link key={to} to={to}>
                <Card className="hover:border-pht-500/40 transition-colors">
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-pht-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
