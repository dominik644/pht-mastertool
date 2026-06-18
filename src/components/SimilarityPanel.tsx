import { useMemo } from 'react';
import { useTenders } from '../context/TenderContext';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

export function SimilarityPanel({ compact = false }: { compact?: boolean }) {
  const { allTenders, openTender } = useTenders();

  const clusters = useMemo(
    () => allTenders
      .filter((t) => t.similarityHints && t.similarityHints.length > 0)
      .slice(0, compact ? 10 : 15)
      .map((t) => ({ source: t, hints: t.similarityHints! })),
    [allTenders, compact],
  );

  if (clusters.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500 text-sm">
          Noch keine Ähnlichkeiten berechnet. Daten laden…
        </CardContent>
      </Card>
    );
  }

  return (
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
                <button
                  key={h.tenderId}
                  type="button"
                  onClick={() => openTender(h.tenderId)}
                  className="w-full flex items-start justify-between gap-3 text-left p-2 -mx-2 rounded-lg hover:bg-dark-600/40 transition-colors"
                >
                  <div>
                    <p className="text-sm text-slate-300 hover:text-pht-400">{h.title}</p>
                    {h.reasons.length > 0 && (
                      <p className="text-xs text-slate-600 mt-0.5">{h.reasons.join(' · ')}</p>
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
  );
}
