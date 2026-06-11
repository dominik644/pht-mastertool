import { useMemo } from 'react';
import { useTenders } from '../context/TenderContext';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

export function SimilarityMobile() {
  const { allTenders, openTender } = useTenders();

  const clusters = useMemo(() => {
    return allTenders
      .filter((t) => t.similarityHints && t.similarityHints.length > 0)
      .slice(0, 15)
      .map((t) => ({ source: t, hints: t.similarityHints! }));
  }, [allTenders]);

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-xl font-bold text-white">Ähnlichkeiten</h1>
        <p className="text-xs text-slate-500 mt-0.5">Heuristische Projekt-Ähnlichkeit</p>
      </header>

      {clusters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500 text-sm">
            Noch keine Ähnlichkeiten berechnet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clusters.map(({ source, hints }) => (
            <Card key={source.id}>
              <CardContent className="py-4">
                <button type="button" onClick={() => openTender(source.id)} className="text-left w-full min-h-[44px]">
                  <h3 className="font-medium text-white text-sm line-clamp-2">{source.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{source.country} · Score {source.score}</p>
                </button>
                <div className="mt-3 space-y-1 pl-3 border-l-2 border-pht-500/30">
                  {hints.map((h) => (
                    <button
                      key={h.tenderId}
                      type="button"
                      onClick={() => openTender(h.tenderId)}
                      className="w-full flex items-start justify-between gap-3 text-left p-2.5 rounded-xl active:bg-dark-600/40 min-h-[52px]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-slate-300 line-clamp-2">{h.title}</p>
                        {h.reasons.length > 0 && (
                          <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">{h.reasons.join(' · ')}</p>
                        )}
                      </div>
                      <Badge variant="score">{h.score}%</Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
