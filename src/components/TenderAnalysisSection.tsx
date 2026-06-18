import { useCallback, useEffect, useState } from 'react';
import { Brain, Loader2, RefreshCw } from 'lucide-react';
import { formatPriceListAmount } from '../data/priceList2026';
import {
  analyzeTenderRemote,
  loadCachedAnalysis,
  type TenderAnalysisResult,
} from '../services/tenderAnalysis';
import type { Tender } from '../types/tender';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

interface TenderAnalysisSectionProps {
  tender: Tender;
}

export function TenderAnalysisSection({ tender }: TenderAnalysisSectionProps) {
  const [analysis, setAnalysis] = useState<TenderAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = tender.url || tender.sourceUrl;

  const runAnalysis = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      if (!force) {
        const cached = loadCachedAnalysis(tender.id);
        if (cached) {
          setAnalysis(cached);
          setLoading(false);
          return;
        }
      }
      const result = await analyzeTenderRemote({
        tenderId: tender.id,
        title: tender.title,
        description: tender.description,
        pdfUrl: pdfUrl?.includes('.pdf') ? pdfUrl : undefined,
        force,
      });
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyse fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, [tender.id, tender.title, tender.description, pdfUrl]);

  useEffect(() => {
    void runAnalysis(false);
  }, [runAnalysis]);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-400" />
            KI-Analyse
          </h3>
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAnalysis(true)}
            className="text-xs text-slate-500 hover:text-pht-400 flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {loading ? 'Analysiert…' : 'Neu analysieren'}
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        {analysis?.note && <p className="text-xs text-amber-400/80 mb-2">{analysis.note}</p>}
        {analysis?.aiError && <p className="text-xs text-amber-400/80 mb-2">KI: {analysis.aiError}</p>}

        {loading && !analysis && (
          <p className="text-xs text-slate-500">Analysiere Anforderungen und Preisliste…</p>
        )}

        {analysis && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="score">{analysis.overallMatchPct}% Match</Badge>
              <Badge variant="muted">{analysis.hygieneRelevance} Relevanz</Badge>
              <Badge variant="muted">{analysis.mode}</Badge>
            </div>
            {analysis.summaryDe && (
              <p className="text-xs text-slate-300 leading-relaxed">{analysis.summaryDe}</p>
            )}
            {analysis.requirements.length > 0 && (
              <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                {analysis.requirements.slice(0, 6).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {analysis.matches.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Empfohlene Artikel</p>
                <ul className="space-y-1.5">
                  {analysis.matches.slice(0, 5).map((m) => (
                    <li key={m.articleNumber} className="flex justify-between gap-2 text-xs">
                      <span className="text-slate-300 truncate">
                        <span className="text-pht-400 font-mono">{m.articleNumber}</span> {m.name}
                        <span className="text-slate-600 ml-1">({m.matchPct}%)</span>
                      </span>
                      <span className="text-slate-500 shrink-0">{formatPriceListAmount(m.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
