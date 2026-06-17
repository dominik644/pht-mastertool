import { Download, ExternalLink, Globe, Newspaper, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import { useViewMode } from '../context/ViewModeContext';
import { meetsPortfolioFilter } from '../lib/portfolioFilter';
import { exportWeeklyGoReportCsv } from '../services/exportTenders';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

interface DiscoveredLead {
  id: string;
  title: string;
  description?: string;
  url: string;
  publishedAt: string;
  sourceName: string;
  topSegment?: string | null;
  relevanceScore?: number;
}

interface LeadsData {
  fetchedAt: string | null;
  leadCount: number;
  leads: DiscoveredLead[];
}

export function OpportunitiesPage() {
  const { isMobileView } = useViewMode();
  const { visibleTenders, loading, openTender } = useTenders();
  const [leadsData, setLeadsData] = useState<LeadsData>({ fetchedAt: null, leadCount: 0, leads: [] });
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [tab, setTab] = useState<'unified' | 'leads' | 'tenders'>('unified');

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const res = await fetch('/data/leads/discovered-leads.json');
      if (res.ok) {
        setLeadsData(await res.json());
      }
    } catch {
      /* optional file */
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => { void loadLeads(); }, [loadLeads]);

  const portfolioTenders = useMemo(
    () => visibleTenders
      .filter(meetsPortfolioFilter)
      .filter((t) => t.scoreRecommendation !== 'NO-GO')
      .sort((a, b) => b.score - a.score)
      .slice(0, 50),
    [visibleTenders],
  );

  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const weeklyGo = useMemo(
    () => visibleTenders
      .filter((t) => t.scoreRecommendation === 'GO')
      .filter((t) => !t.publicationDate || t.publicationDate >= weekAgo)
      .sort((a, b) => b.score - a.score),
    [visibleTenders, weekAgo],
  );

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-7xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-5' : 'mb-8'} flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4`}>
        <div>
          <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
            <Globe className="w-7 h-7 text-pht-400" />
            Opportunities
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Entdeckte Leads + öffentliche Ausschreibungen · PHT Portfolio
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportWeeklyGoReportCsv(weeklyGo)}
            disabled={weeklyGo.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dark-500 text-sm text-slate-300 hover:bg-dark-700 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Wöchentlicher Report
          </button>
          <button
            type="button"
            onClick={() => void loadLeads()}
            disabled={leadsLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${leadsLoading ? 'animate-spin' : ''}`} />
            Leads aktualisieren
          </button>
        </div>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['unified', 'tenders', 'leads'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
              tab === t ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
            }`}
          >
            {t === 'unified' ? 'Vereint' : t === 'tenders' ? `Ausschreibungen (${portfolioTenders.length})` : `Leads (${leadsData.leadCount})`}
          </button>
        ))}
      </div>

      {(tab === 'unified' || tab === 'tenders') && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Öffentliche Ausschreibungen (Portfolio)</h2>
          </CardHeader>
          <CardContent>
            {loading && portfolioTenders.length === 0 ? (
              <p className="text-sm text-slate-500">Lädt…</p>
            ) : portfolioTenders.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Portfolio-Treffer. <Link to="/tenders" className="text-pht-400">Suche öffnen</Link></p>
            ) : (
              <div className="space-y-2">
                {portfolioTenders.slice(0, tab === 'unified' ? 15 : 50).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTender(t.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-dark-500/40 hover:border-pht-500/30 text-left"
                  >
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="text-sm font-medium text-white truncate">{t.title}</p>
                      <p className="text-xs text-slate-500">{t.country} · {t.sourcePlatform} · {t.deadline}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant="score">{t.score}</Badge>
                      <Badge variant={t.scoreRecommendation === 'GO' ? 'success' : 'warning'}>{t.scoreRecommendation}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(tab === 'unified' || tab === 'leads') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-pht-400" />
              Entdeckte Leads
            </h2>
            {leadsData.fetchedAt && (
              <span className="text-xs text-slate-500">
                {new Date(leadsData.fetchedAt).toLocaleString('de-DE')}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <p className="text-sm text-slate-500">Lädt Leads…</p>
            ) : leadsData.leads.length === 0 ? (
              <p className="text-sm text-slate-500">
                Noch keine Leads. Cron: <code className="text-xs">node scripts/run-lead-discovery.mjs</code>
              </p>
            ) : (
              <div className="space-y-2">
                {leadsData.leads.slice(0, tab === 'unified' ? 10 : 100).map((lead) => (
                  <a
                    key={lead.id}
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-dark-500/40 hover:border-pht-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{lead.title}</p>
                        {lead.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{lead.description}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-1">
                          {lead.sourceName}
                          {lead.topSegment ? ` · ${lead.topSegment}` : ''}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
