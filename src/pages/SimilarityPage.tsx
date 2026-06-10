import { useMemo } from 'react';
import { useTenders } from '../context/TenderContext';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function SimilarityPage() {
  const { allTenders, openTender } = useTenders();

  const clusters = useMemo(() => {
    return allTenders
      .filter((t) => t.similarityHints && t.similarityHints.length > 0)
      .slice(0, 15)
      .map((t) => ({ source: t, hints: t.similarityHints! }));
  }, [allTenders]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Ähnlichkeitsanalyse</h1>
        <p className="text-slate-400 mt-1 text-sm">Heuristische Projekt-Ähnlichkeit nach Titel, Keywords, Branche und Region</p>
      </header>

      {clusters.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">Noch keine Ähnlichkeiten berechnet. Daten laden…</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {clusters.map(({ source, hints }) => (
            <Card key={source.id}>
              <CardContent className="py-5">
                <button type="button" onClick={() => openTender(source.id)} className="text-left w-full">
                  <h3 className="font-medium text-white hover:text-pht-400">{source.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{source.country} · {source.industry} · Score {source.score}</p>
                </button>
                <div className="mt-4 space-y-2 pl-4 border-l-2 border-pht-500/30">
                  {hints.map((h) => (
                    <div key={h.tenderId} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-300">{h.title}</p>
                        {h.reasons.length > 0 && <p className="text-xs text-slate-600 mt-0.5">{h.reasons.join(' · ')}</p>}
                      </div>
                      <Badge variant="score">{h.score}%</Badge>
                    </div>
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
