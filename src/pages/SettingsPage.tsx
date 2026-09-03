import {
  Calculator, Crown, Database, GitBranch, Shield, UserCog,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
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

export function SettingsPage() {
  const { isMobileView } = useViewMode();

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-3xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-5' : 'mb-8'}`}>
        <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white`}>Einstellungen</h1>
        <p className="text-slate-400 mt-1 text-sm">Tourenplanung, Integrationen und Datenschutz</p>
      </header>

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
    </div>
  );
}
