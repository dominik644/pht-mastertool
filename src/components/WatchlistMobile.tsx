import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };

export function WatchlistMobile() {
  const { allTenders, openTender } = useTenders();
  const watchlistTenders = allTenders.filter((t) => t.watchlist).sort((a, b) => b.score - a.score);

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-xl font-bold text-white">Watchlist</h1>
        <p className="text-xs text-slate-500 mt-0.5">{watchlistTenders.length} gespeicherte Ausschreibungen</p>
      </header>

      {watchlistTenders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 text-sm">Noch keine Ausschreibungen auf der Watchlist.</p>
            <Link to="/tenders" className="text-pht-400 text-sm mt-3 inline-block min-h-[44px] flex items-center justify-center">
              Globale Suche →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {watchlistTenders.map((t) => (
            <Card key={t.id} glow>
              <CardContent className="py-3.5">
                <button type="button" onClick={() => openTender(t.id)} className="w-full text-left min-h-[44px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white text-sm line-clamp-2">{t.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{t.country} · {t.revenuePotential}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="score">{t.score}</Badge>
                        <Badge variant={recVariant[t.scoreRecommendation]}>{t.scoreRecommendation}</Badge>
                      </div>
                      {(t.status || t.nextAction) && (
                        <p className="text-[10px] text-slate-600 mt-2 line-clamp-1">
                          {t.status}{t.nextAction ? ` · ${t.nextAction}` : ''}
                        </p>
                      )}
                    </div>
                    <a
                      href={t.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
