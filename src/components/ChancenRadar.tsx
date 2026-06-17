import { Radar } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import { getCatalogScore } from '../lib/portfolioFilter';
import { Badge } from './ui/Badge';
import { Card, CardContent, CardHeader } from './ui/Card';

const LINE_COLORS: Record<string, string> = {
  personalhygiene: 'text-sky-400',
  schaumniederdruck: 'text-cyan-400',
  industriewaschanlagen: 'text-emerald-400',
  betriebshygiene: 'text-violet-400',
  'schliessfach-garderobe': 'text-amber-400',
  reinigungsgeraete: 'text-lime-400',
  'lebensmittel-anlagenbau': 'text-orange-400',
};

function getLineLabel(tender: { scoreBreakdown?: unknown; productMatch?: { profiles?: { name: string }[] } }) {
  const bd = tender.scoreBreakdown as {
    matchedCatalogLines?: { name: string; id?: string }[];
    topProfile?: string;
    matchedPortfolioSegments?: { name: string; segmentId?: string }[];
  } | undefined;
  if (bd?.matchedCatalogLines?.[0]?.name) return bd.matchedCatalogLines[0].name;
  if (bd?.matchedPortfolioSegments?.[0]?.name) return bd.matchedPortfolioSegments[0].name;
  if (bd?.topProfile) return bd.topProfile;
  if (tender.productMatch?.profiles?.[0]?.name) return tender.productMatch.profiles[0].name;
  return 'Portfolio';
}

function getLineId(tender: { scoreBreakdown?: unknown }) {
  const bd = tender.scoreBreakdown as {
    matchedCatalogLines?: { id?: string }[];
    matchedPortfolioSegments?: { segmentId?: string; lineId?: string }[];
  } | undefined;
  return bd?.matchedCatalogLines?.[0]?.id
    ?? bd?.matchedPortfolioSegments?.[0]?.lineId
    ?? bd?.matchedPortfolioSegments?.[0]?.segmentId
    ?? 'portfolio';
}

export function ChancenRadar() {
  const { visibleTenders, openTender } = useTenders();

  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const top20 = useMemo(() => {
    return visibleTenders
      .filter((t) => t.scoreRecommendation === 'GO' || t.score >= 60)
      .filter((t) => !t.publicationDate || t.publicationDate >= weekAgo || t.status === 'Neu')
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [visibleTenders, weekAgo]);

  const byLine = useMemo(() => {
    const groups: Record<string, typeof top20> = {};
    for (const t of top20) {
      const line = getLineLabel(t);
      if (!groups[line]) groups[line] = [];
      groups[line].push(t);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [top20]);

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Radar className="w-4 h-4 text-pht-400" />
          Chancen Radar
          <span className="text-xs font-normal text-slate-500">Top 20 diese Woche</span>
        </h2>
        <Link to="/tenders?preset=portfolio" className="text-xs text-pht-400 hover:text-pht-300">
          Portfolio-Filter
        </Link>
      </CardHeader>
      <CardContent>
        {top20.length === 0 ? (
          <p className="text-sm text-slate-500">Keine GO-Chancen diese Woche – Scan läuft…</p>
        ) : (
          <div className="space-y-4">
            {byLine.map(([line, items]) => (
              <div key={line}>
                <p className={`text-xs font-medium mb-2 ${LINE_COLORS[getLineId(items[0])] ?? 'text-slate-400'}`}>
                  {line} ({items.length})
                </p>
                <div className="space-y-1.5">
                  {items.slice(0, 5).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openTender(t.id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-dark-500/40 hover:border-pht-500/30 hover:bg-dark-600/30 transition-all text-left"
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-sm text-white truncate">{t.title}</p>
                        <p className="text-xs text-slate-500">
                          {t.country} · Kat. {t.category}
                          {getCatalogScore(t) > 0 ? ` · Katalog ${getCatalogScore(t)}` : ''}
                        </p>
                      </div>
                      <Badge variant="score">{t.score}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
