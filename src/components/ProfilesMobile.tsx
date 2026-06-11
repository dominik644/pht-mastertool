import { Link } from 'react-router-dom';
import { PRODUCT_PROFILES } from '../lib/productProfiles';
import { useTenders } from '../context/TenderContext';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

export function ProfilesMobile() {
  const { allTenders, stats } = useTenders();

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-xl font-bold text-white">Profile & Scoring</h1>
        <p className="text-xs text-slate-500 mt-0.5">PHT Produktprofile · Scoring 0–100</p>
      </header>

      <Link to="/go-no-go" className="block">
        <Card className="active:scale-[0.99] transition-transform">
          <CardContent className="py-4">
            <h2 className="text-sm font-semibold text-white mb-2">Scoring-Logik</h2>
            <div className="text-xs text-slate-400 space-y-1.5">
              <p><span className="text-emerald-400 font-medium">&gt;70 = GO</span> · Sofort verfolgen</p>
              <p><span className="text-amber-400 font-medium">40–70 = Prüfen</span> · Vertrieb bewertet</p>
              <p><span className="text-red-400 font-medium">&lt;40 = NO-GO</span> · Geringe Priorität</p>
            </div>
            <p className="text-[10px] text-pht-400 mt-3">GO/NO-GO Bewertung →</p>
          </CardContent>
        </Card>
      </Link>

      <div className="space-y-3">
        {PRODUCT_PROFILES.map((p: { id: string; name: string; icon: string; description: string; keywords: string[]; products: string[] }) => {
          const matches = allTenders.filter((t) => t.productMatch.profiles?.some((pr) => pr.id === p.id));
          const count = stats.profileDistribution[p.name] ?? matches.length;
          return (
            <Link key={p.id} to={`/tenders?q=${encodeURIComponent(p.name)}`} className="block">
              <Card glow className="active:scale-[0.99] transition-transform">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-white text-sm">{p.name}</h3>
                        <Badge variant="score">{count}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{p.description}</p>
                      <p className="text-[10px] text-slate-600 mt-2 line-clamp-1">Keywords: {p.keywords.slice(0, 4).join(', ')}</p>
                      <p className="text-[10px] text-pht-400 mt-1">{count} Treffer →</p>
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
