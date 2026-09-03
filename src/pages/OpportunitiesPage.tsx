import { Download, GitBranch, Globe, HardHat, Newspaper, RefreshCw, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import { useViewMode } from '../context/ViewModeContext';
import { meetsPortfolioFilter } from '../lib/portfolioFilter';
import { dachRegionLabel, isDachCountry } from '../lib/dachRegion';
import { fetchLeadsJson } from '../lib/leadsData';
import { withFilteredDiscoveredPayload, withFilteredNewsPayload } from '../lib/newsLeadFilters';
import {
  PRIVATE_INTELLIGENCE_ROADMAP,
  ROADMAP_STATUS_LABELS,
  ROADMAP_TIER_LABELS,
  type PrivateIntelligenceRoadmapItem,
} from '../lib/privateIntelligenceRoadmap';
import { exportWeeklyGoReportCsv } from '../services/exportTenders';
import { addFromDiscoveredLead, addFromNewsLead } from '../services/salesPipelineStorage';
import { usePipelineSourceIds } from '../hooks/usePipelineSourceIds';
import { NewsLeadCard } from '../components/NewsLeadCard';
import { TranslatedText } from '../components/TranslatedText';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import type { NewsLead } from '../types/newsLead';

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

interface NewsLeadsData {
  fetchedAt: string | null;
  leadCount: number;
  leads: NewsLead[];
}

type TabId = 'unified' | 'tenders' | 'leads' | 'news';

const DACH_DAILY_CHECK_KEY = 'pht_opportunities_dach_daily';

function resolveOpportunitiesTab(raw: string | null): TabId {
  if (raw === 'tenders' || raw === 'leads' || raw === 'news' || raw === 'unified') return raw;
  return 'unified';
}

export function OpportunitiesPage() {
  const { isMobileView } = useViewMode();
  const { visibleTenders, loading, openTender } = useTenders();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leadsData, setLeadsData] = useState<LeadsData>({ fetchedAt: null, leadCount: 0, leads: [] });
  const [newsData, setNewsData] = useState<NewsLeadsData>({ fetchedAt: null, leadCount: 0, leads: [] });
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>(() => resolveOpportunitiesTab(searchParams.get('tab')));
  const dachOnly = searchParams.get('dach') !== '0';
  const todayKey = new Date().toISOString().slice(0, 10);
  const [dachDailyDone, setDachDailyDone] = useState(
    () => localStorage.getItem(DACH_DAILY_CHECK_KEY) === todayKey,
  );

  const setDachOnly = (on: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (on) next.delete('dach');
      else next.set('dach', '0');
      return next;
    }, { replace: true });
  };

  const markDachDailyDone = () => {
    localStorage.setItem(DACH_DAILY_CHECK_KEY, todayKey);
    setDachDailyDone(true);
  };

  const pipelineNewsIds = usePipelineSourceIds('news');
  const pipelineLeadIds = usePipelineSourceIds('lead');

  const visibleNewsLeads = useMemo(
    () => newsData.leads.filter((l) => !pipelineNewsIds.has(l.id)),
    [newsData.leads, pipelineNewsIds],
  );

  const visibleDiscoveredLeads = useMemo(
    () => leadsData.leads.filter((l) => !pipelineLeadIds.has(l.id)),
    [leadsData.leads, pipelineLeadIds],
  );
  useEffect(() => {
    setTab(resolveOpportunitiesTab(searchParams.get('tab')));
  }, [searchParams]);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const [leads, news] = await Promise.all([
        fetchLeadsJson<LeadsData>('discovered-leads.json'),
        fetchLeadsJson<NewsLeadsData>('news-leads.json'),
      ]);
      if (leads) setLeadsData(withFilteredDiscoveredPayload(leads) ?? leads);
      if (news) setNewsData(withFilteredNewsPayload(news) ?? news);
      if (!news && !leads) {
        setLeadsError('Lead-Dateien nicht gefunden – Build prüfen (public/data/leads/).');
      }
    } catch {
      setLeadsError('Lead-Daten konnten nicht geladen werden.');
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => { void loadLeads(); }, [loadLeads]);

  const portfolioTenders = useMemo(
    () => visibleTenders
      .filter(meetsPortfolioFilter)
      .filter((t) => t.scoreRecommendation !== 'NO-GO')
      .filter((t) => !dachOnly || isDachCountry(t.country))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50),
    [visibleTenders, dachOnly],
  );

  const dachNewsLeads = useMemo(
    () => visibleNewsLeads.filter((l) => !dachOnly || isDachCountry(l.country)),
    [visibleNewsLeads, dachOnly],
  );

  const dachDiscoveredLeads = useMemo(
    () => visibleDiscoveredLeads.filter((l) => !dachOnly || isDachCountry((l as { country?: string }).country)),
    [visibleDiscoveredLeads, dachOnly],
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

  const tabs: { id: TabId; label: string }[] = [
    { id: 'unified', label: 'Vereint' },
    { id: 'tenders', label: `Öffentlich (${portfolioTenders.length})` },
    { id: 'news', label: `Private Investitionen (${dachNewsLeads.length})` },
    { id: 'leads', label: `Feed-Leads (${dachDiscoveredLeads.length})` },
  ];

  const roadmapByTier = useMemo(() => {
    const tiers: PrivateIntelligenceRoadmapItem['tier'][] = ['tool', 'abo', 'vertrieb'];
    return tiers.map((tier) => ({
      tier,
      label: ROADMAP_TIER_LABELS[tier],
      items: PRIVATE_INTELLIGENCE_ROADMAP.filter((item) => item.tier === tier),
    }));
  }, []);

  const renderPrivateRoadmapCard = () => (
    <Card className="mb-6 border-amber-500/20">
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <HardHat className="w-4 h-4 text-amber-400" />
          Private Bauchancen – Intelligence-Roadmap
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Nestlé, Arla, FMCG-Werke, Logistikhallen – Frühindikatoren vor GU-Vergabe (nicht über TED)
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {roadmapByTier.map(({ tier, label, items }) => (
            <div key={tier} className="rounded-lg border border-dark-500/50 bg-dark-700/30 p-3">
              <p className="text-xs font-medium text-amber-300 mb-2">{label}</p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 text-xs" title={item.note}>
                    <span className={`text-slate-300 ${item.note ? 'cursor-help' : ''}`}>{item.label}</span>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        item.status === 'live' ? 'bg-emerald-500/20 text-emerald-300'
                          : item.status === 'beta' ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-600/40 text-slate-400'
                      } ${item.note ? 'cursor-help underline decoration-dotted decoration-slate-500' : ''}`}
                      title={item.note}
                    >
                      {ROADMAP_STATUS_LABELS[item.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderNewsCard = (limit: number) => (
    <Card className={tab === 'unified' ? 'mb-6' : ''}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Private Investitions-News &amp; Expansion
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Frühindikatoren vor Ausschreibung – Konzernpresse, Branchenmedien, Google News (keine Vergabeportale)
          </p>
        </div>
        {newsData.fetchedAt && (
          <span className="text-xs text-slate-500">
            {new Date(newsData.fetchedAt).toLocaleString('de-DE')}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {leadsLoading ? (
          <p className="text-sm text-slate-500">Lädt Branchen-News…</p>
        ) : visibleNewsLeads.length === 0 ? (
          <p className="text-sm text-slate-500">
            {newsData.leads.length > 0
              ? 'Alle News-Leads sind in der Vertriebs-Pipeline.'
              : <>Noch keine News-Signale. Daten unter <code className="text-xs">/data/leads/news-leads.json</code> fehlen oder Cron ausstehend: <code className="text-xs">npm run lead-discovery</code></>}
          </p>
        ) : dachNewsLeads.length === 0 ? (
          <p className="text-sm text-slate-500">Keine DACH-News im aktuellen Filter.</p>
        ) : (
          <div className="space-y-2">
            {dachNewsLeads.slice(0, limit).map((lead) => (
              <NewsLeadCard
                key={lead.id}
                lead={lead}
                onAddToPipeline={addFromNewsLead}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
            {dachRegionLabel()} · Öffentliche Ausschreibungen und private Investitions-News – PHT Portfolio
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setDachOnly(!dachOnly)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs sm:text-sm shrink-0 min-h-[44px] ${
              dachOnly
                ? 'border-pht-500/50 bg-pht-600/20 text-pht-300'
                : 'border-dark-500 text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            {dachOnly ? 'Nur DACH' : 'Weltweit'}
          </button>
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

      {leadsError && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
          {leadsError}
        </div>
      )}

      {dachOnly && !dachDailyDone && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-pht-500/30 bg-pht-600/10">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-pht-200">Täglicher DACH-Check</p>
            <p className="text-xs text-pht-300/80 mt-0.5">
              Neue Chancen in Österreich, Deutschland und der Schweiz prüfen
              {newsData.fetchedAt && (
                <span className="text-slate-500">
                  {' · '}News zuletzt: {new Date(newsData.fetchedAt).toLocaleString('de-DE')}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={markDachDailyDone}
            className="shrink-0 px-3 py-2 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700"
          >
            Heute erledigt
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
              tab === id ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(tab === 'unified' || tab === 'news') && renderPrivateRoadmapCard()}

      {(tab === 'unified' || tab === 'tenders') && (
        <Card className="mb-6">
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold text-white">Öffentliche Ausschreibungen (Portfolio)</h2>
              <p className="text-xs text-slate-500 mt-1">
                TED, BBG, nationale Vergabeportale – Kommunen, Krankenhäuser, öffentliche Betriebe
              </p>
            </div>
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
                      <p className="text-sm font-medium text-white truncate">
                        <TranslatedText text={t.title} as="span" />
                      </p>
                      {t.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          <TranslatedText text={t.description} as="span" />
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">{t.country} · {t.sourcePlatform} · {t.deadline}</p>
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

      {(tab === 'unified' || tab === 'news') && renderNewsCard(tab === 'unified' ? 8 : 100)}

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
            ) : visibleDiscoveredLeads.length === 0 ? (
              <p className="text-sm text-slate-500">
                {leadsData.leads.length > 0
                  ? 'Alle Feed-Leads sind in der Vertriebs-Pipeline.'
                  : <>Noch keine Leads. Cron: <code className="text-xs">npm run lead-discovery</code></>}
              </p>
            ) : dachDiscoveredLeads.length === 0 ? (
              <p className="text-sm text-slate-500">Keine DACH-Feed-Leads im aktuellen Filter.</p>
            ) : (
              <div className="space-y-2">
                {dachDiscoveredLeads.slice(0, tab === 'unified' ? 10 : 100).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-dark-500/40 hover:border-pht-500/30"
                  >
                    <a href={lead.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        <TranslatedText text={lead.title} as="span" />
                      </p>
                      {lead.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          <TranslatedText text={lead.description} as="span" />
                        </p>
                      )}
                      <p className="text-xs text-slate-600 mt-1">
                        {lead.sourceName}
                        {lead.topSegment ? ` · ${lead.topSegment}` : ''}
                      </p>
                    </a>
                    <button
                      type="button"
                      onClick={() => addFromDiscoveredLead(lead)}
                      className="p-2 rounded-lg border border-pht-500/30 text-pht-400 hover:bg-pht-600/10 shrink-0"
                      title="Zur Vertriebs-Pipeline"
                    >
                      <GitBranch className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
