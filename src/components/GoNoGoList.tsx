import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };

export function GoNoGoList() {
  const { allTenders, loading, openTender } = useTenders();
  const evaluated = allTenders.filter((t) => t.score > 0).sort((a, b) => b.score - a.score);

  const groups = {
    GO: evaluated.filter((t) => t.scoreRecommendation === 'GO'),
    'PRÜFEN': evaluated.filter((t) => t.scoreRecommendation === 'PRÜFEN'),
    'NO-GO': evaluated.filter((t) => t.scoreRecommendation === 'NO-GO'),
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">GO / NO-GO Bewertung</h1>
        <p className="text-slate-400 mt-1 text-sm">PHT Scoring Engine · {loading ? 'lädt…' : `${evaluated.length} bewertete Projekte`}</p>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {(['GO', 'PRÜFEN', 'NO-GO'] as const).map((rec) => (
          <Link key={rec} to={`/tenders?reco=${encodeURIComponent(rec)}`} className="block">
            <Card glow={rec === 'GO'} className="h-full hover:border-pht-500/40 transition-colors cursor-pointer">
              <CardContent className="py-4 text-center">
                <p className="text-xs text-slate-500 uppercase">{rec}</p>
                <p className={`text-3xl font-bold mt-1 ${rec === 'GO' ? 'text-emerald-400' : rec === 'PRÜFEN' ? 'text-amber-400' : 'text-red-400'}`}>
                  {groups[rec].length}
                </p>
                <p className="text-[10px] text-slate-600 mt-1">{rec === 'GO' ? '>70 Score' : rec === 'PRÜFEN' ? '40–70 Score' : '<40 Score'}</p>
                <p className="text-[10px] text-pht-400/70 mt-2">Filter anzeigen →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(['GO', 'PRÜFEN', 'NO-GO'] as const).map((rec) => (
        <div key={rec} className="mb-8">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Badge variant={recVariant[rec]}>{rec}</Badge>
            <span className="text-slate-500">({groups[rec].length})</span>
          </h2>
          <div className="space-y-2">
            {groups[rec].map((t) => (
              <Card key={t.id} onClick={() => openTender(t.id)}>
                <CardContent className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.country} · {t.region} · {t.revenuePotential}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="score">{t.score}</Badge>
                    <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-slate-500 hover:text-pht-400"><ExternalLink className="w-4 h-4" /></a>
                  </div>
                </CardContent>
              </Card>
            ))}
            {groups[rec].length === 0 && <p className="text-sm text-slate-600">Keine Einträge.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
