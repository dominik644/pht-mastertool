import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import { useTenders } from '../context/TenderContext';
import { WatchlistMobile } from './WatchlistMobile';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };

export function Watchlist() {
  const { isMobileView } = useViewMode();
  if (isMobileView) return <WatchlistMobile />;

  const { allTenders } = useTenders();
  const watchlistTenders = allTenders.filter((t) => t.watchlist).sort((a, b) => b.score - a.score);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Watchlist & Pipeline</h1>
        <p className="text-slate-400 mt-1 text-sm">{watchlistTenders.length} gespeicherte Ausschreibungen</p>
      </header>

      {watchlistTenders.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-slate-500">Noch keine Ausschreibungen auf der Watchlist.</p>
          <Link to="/tenders" className="text-pht-400 text-sm mt-2 inline-block">Globale Suche →</Link>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {watchlistTenders.map((t) => (
            <Card key={t.id} glow>
              <CardContent className="py-4">
                <Link to={`/tenders/${t.id}`} className="block">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium text-white hover:text-pht-400">{t.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{t.country} · {t.region} · {t.revenuePotential}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
                        <span>Status: <strong className="text-slate-400">{t.status}</strong></span>
                        {t.responsible && <span>· {t.responsible}</span>}
                        {t.nextAction && <span>· {t.nextAction}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="score">{t.score}</Badge>
                      <Badge variant={recVariant[t.scoreRecommendation]}>{t.scoreRecommendation}</Badge>
                      <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-slate-500 hover:text-pht-400"><ExternalLink className="w-4 h-4" /></a>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
