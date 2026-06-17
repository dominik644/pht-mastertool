import { ExternalLink, Star } from 'lucide-react';
import { memo } from 'react';
import type { Tender } from '../types/tender';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };
const catVariant = { A: 'muted' as const, B: 'warning' as const, C: 'danger' as const };

export interface TenderCardProps {
  tender: Tender;
  onToggleWatchlist: (id: string) => void;
  onOpen: (id: string) => void;
}

export const TenderCard = memo(function TenderCard({
  tender: t,
  onToggleWatchlist,
  onOpen,
}: TenderCardProps) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => onToggleWatchlist(t.id)}
            className={`mt-1 p-1 rounded ${t.watchlist ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
          >
            <Star className={`w-5 h-5 ${t.watchlist ? 'fill-current' : ''}`} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <button type="button" onClick={() => onOpen(t.id)} className="text-left">
                  <h3 className="font-medium text-white hover:text-pht-400 transition-colors">
                    {t.title}
                  </h3>
                </button>
                <p className="text-sm text-slate-500 mt-1">
                  {t.country} · {t.region} · {t.sourcePlatform} · {t.revenuePotential}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Deadline {t.deadline} · {t.productMatch.main}
                </p>
                <a
                  href={t.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-pht-400 hover:text-pht-300 mt-2"
                >
                  <ExternalLink className="w-3 h-3" /> {t.sourcePlatform}
                </a>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge variant="score">{t.score}/100</Badge>
                <Badge variant={recVariant[t.scoreRecommendation]}>{t.scoreRecommendation}</Badge>
                <Badge variant={catVariant[t.category]}>{t.category}</Badge>
                {t.fromHistory && <Badge variant="muted">aus Verlauf</Badge>}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
