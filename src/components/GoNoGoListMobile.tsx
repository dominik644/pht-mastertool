import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTenders } from '../context/TenderContext';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };
const recColors = { GO: 'text-emerald-400', 'PRÜFEN': 'text-amber-400', 'NO-GO': 'text-red-400' };

export function GoNoGoListMobile() {
  const { allTenders, loading, openTender } = useTenders();
  const [activeTab, setActiveTab] = useState<'GO' | 'PRÜFEN' | 'NO-GO'>('GO');

  const evaluated = allTenders.filter((t) => t.score > 0).sort((a, b) => b.score - a.score);
  const groups = {
    GO: evaluated.filter((t) => t.scoreRecommendation === 'GO'),
    'PRÜFEN': evaluated.filter((t) => t.scoreRecommendation === 'PRÜFEN'),
    'NO-GO': evaluated.filter((t) => t.scoreRecommendation === 'NO-GO'),
  };

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-xl font-bold text-white">GO / NO-GO</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          PHT Scoring · {loading ? 'lädt…' : `${evaluated.length} Projekte`}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {(['GO', 'PRÜFEN', 'NO-GO'] as const).map((rec) => (
          <button
            key={rec}
            type="button"
            onClick={() => setActiveTab(rec)}
            className={`p-3 rounded-xl border text-center min-h-[72px] active:scale-[0.97] transition-transform ${
              activeTab === rec ? 'border-pht-500/50 bg-pht-600/15' : 'border-dark-500/50 bg-dark-700/30'
            }`}
          >
            <p className="text-[10px] text-slate-500 uppercase">{rec}</p>
            <p className={`text-2xl font-bold mt-0.5 ${recColors[rec]}`}>{groups[rec].length}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Badge variant={recVariant[activeTab]}>{activeTab}</Badge>
        <Link to={`/tenders?reco=${encodeURIComponent(activeTab)}`} className="text-xs text-pht-400 min-h-[44px] flex items-center">
          In Suche filtern →
        </Link>
      </div>

      <div className="space-y-2">
        {groups[activeTab].length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-8">Keine Einträge.</p>
        ) : (
          groups[activeTab].map((t) => (
            <Card key={t.id} onClick={() => openTender(t.id)}>
              <CardContent className="py-3.5 flex items-center gap-3 min-h-[64px]">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white line-clamp-2">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.country} · {t.revenuePotential}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="score">{t.score}</Badge>
                  <a
                    href={t.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
