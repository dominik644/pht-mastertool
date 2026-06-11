import { Link } from 'react-router-dom';
import { ProfilesMobile } from '../components/ProfilesMobile';
import { useViewMode } from '../context/ViewModeContext';
import { PRODUCT_PROFILES } from '../lib/productProfiles';
import { useTenders } from '../context/TenderContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function ProfilesPage() {
  const { isMobileView } = useViewMode();
  if (isMobileView) return <ProfilesMobile />;

  const { allTenders, stats } = useTenders();

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Profile & Scoring</h1>
        <p className="text-slate-400 mt-1 text-sm">PHT Produktprofile und Scoring-Engine (0–100)</p>
      </header>

      <Link to="/go-no-go" className="block mb-8">
        <Card className="hover:border-pht-500/40 transition-colors cursor-pointer">
          <CardHeader><h2 className="text-sm font-semibold text-white">Scoring-Logik</h2></CardHeader>
          <CardContent className="text-sm text-slate-400 space-y-2">
            <p><span className="text-emerald-400 font-medium">&gt;70 = GO</span> · Sofort verfolgen</p>
            <p><span className="text-amber-400 font-medium">40–70 = Prüfen</span> · Vertrieb bewertet Machbarkeit</p>
            <p><span className="text-red-400 font-medium">&lt;40 = NO-GO</span> · Geringe Priorität</p>
            <p className="pt-2 text-xs text-slate-600">Faktoren: Keyword-Match, Budget, Region, Branche, Produktprofil-Fit · GO/NO-GO Bewertung →</p>
          </CardContent>
        </Card>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PRODUCT_PROFILES.map((p: { id: string; name: string; icon: string; description: string; keywords: string[]; products: string[] }) => {
          const matches = allTenders.filter((t) => t.productMatch.profiles?.some((pr) => pr.id === p.id));
          const count = stats.profileDistribution[p.name] ?? matches.length;
          return (
            <Link key={p.id} to={`/tenders?q=${encodeURIComponent(p.name)}`} className="block">
              <Card glow className="h-full hover:border-pht-500/40 transition-colors cursor-pointer">
                <CardContent className="py-6">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{p.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">{p.name}</h3>
                        <Badge variant="score">{count}</Badge>
                      </div>
                      <p className="text-sm text-slate-400 mt-2">{p.description}</p>
                      <p className="text-xs text-slate-600 mt-3">Keywords: {p.keywords.slice(0, 6).join(', ')}</p>
                      <p className="text-xs text-pht-400 mt-2">Produkte: {p.products.join(', ')} · {count} Treffer anzeigen →</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
