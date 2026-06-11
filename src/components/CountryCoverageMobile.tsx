import { useMemo, useState } from 'react';
import { ExternalLink, Filter, Globe2, Search, X } from 'lucide-react';
import { useTenders } from '../context/TenderContext';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import {
  ALLOWED_COVERAGE_REGIONS,
  coverageStats,
  mergeCountryCoverage,
  sortByStatus,
  statusLabel,
  statusVariant,
  type CoverageStatus,
  type MergedCountryCoverage,
} from '../data/countryCoverage';

const STATUS_FILTERS: { value: CoverageStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'gap', label: 'Lücken' },
  { value: 'partial', label: 'Teilweise' },
  { value: 'covered', label: 'Abgedeckt' },
];

function CountryCard({ country, expanded, onToggle }: {
  country: MergedCountryCoverage;
  expanded: boolean;
  onToggle: () => void;
}) {
  const providerText = country.liveProviders.length
    ? country.liveProviders.join(', ')
    : country.providers.join(', ') || '—';

  return (
    <Card className={country.highlight ? 'border-red-500/30' : ''}>
      <CardContent className="py-3">
        <button type="button" onClick={onToggle} className="w-full text-left min-h-[52px]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{country.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{country.region} · {country.tenderCount} Treffer</p>
            </div>
            <Badge variant={statusVariant(country.effectiveStatus)}>{statusLabel(country.effectiveStatus)}</Badge>
          </div>
          {!expanded && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-1">{providerText}</p>
          )}
        </button>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-dark-500/40 space-y-3 text-sm">
            <p className="text-xs text-slate-400">Provider: {providerText}</p>
            <p className="text-xs text-slate-400">Portal: {country.portalName ?? '—'}</p>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Nächste Schritte</p>
              <ul className="space-y-1 text-xs text-slate-300">
                {country.actionPlan.map((step) => (
                  <li key={step} className="flex gap-2"><span className="text-pht-400">→</span>{step}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-slate-400">{country.notes}</p>
            {country.portalUrl && (
              <a
                href={country.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-pht-400 text-xs min-h-[44px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {country.portalName ?? 'Portal öffnen'}
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CountryCoverageMobile() {
  const { allTenders, loading, dataSource } = useTenders();
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<CoverageStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const merged = useMemo(() => mergeCountryCoverage(allTenders), [allTenders]);
  const stats = useMemo(() => coverageStats(merged), [merged]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return merged
      .filter((c) => {
        if (regionFilter !== 'all' && c.region !== regionFilter) return false;
        if (statusFilter !== 'all' && c.effectiveStatus !== statusFilter) return false;
        if (q && !c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort(sortByStatus);
  }, [merged, regionFilter, statusFilter, search]);

  const activeFilters = [regionFilter !== 'all', statusFilter !== 'all', search.length > 0].filter(Boolean).length;

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-pht-400" />
          Länder-Abdeckung
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {loading ? 'lädt…' : `${allTenders.length} Treffer live`}
          {dataSource && <span className="block mt-0.5">{dataSource}</span>}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-dark-700/50 border border-dark-500/40 text-center">
          <p className="text-xl font-bold text-emerald-400">{stats.covered}</p>
          <p className="text-[10px] text-slate-500">Abgedeckt</p>
        </div>
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
          <p className="text-xl font-bold text-red-400">{stats.gaps}</p>
          <p className="text-[10px] text-slate-500">Lücken</p>
        </div>
        <div className="p-3 rounded-xl bg-dark-700/50 border border-dark-500/40 text-center">
          <p className="text-xl font-bold text-amber-400">{stats.partial}</p>
          <p className="text-[10px] text-slate-500">Teilweise</p>
        </div>
        <div className="p-3 rounded-xl bg-dark-700/50 border border-dark-500/40 text-center">
          <p className="text-xl font-bold text-white">{stats.total}</p>
          <p className="text-[10px] text-slate-500">Länder</p>
        </div>
      </div>

      {stats.highlighted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wide">Prioritäts-Lücken</h2>
          {stats.highlighted.slice(0, 4).map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setExpandedCode(c.code)}
              className="w-full text-left p-3 rounded-xl bg-red-500/10 border border-red-500/30 min-h-[52px]"
            >
              <p className="text-sm font-medium text-white">{c.name}</p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{c.notes}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Land suchen…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500 text-sm text-white min-h-[44px]"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="relative px-3 py-2.5 rounded-xl border border-dark-500 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Filter className="w-4 h-4" />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pht-600 text-[10px] text-white flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      <p className="text-xs text-slate-500">{loading ? 'Lade…' : `${filtered.length} Länder`}</p>

      <div className="space-y-2">
        {filtered.map((c) => (
          <CountryCard
            key={c.code}
            country={c}
            expanded={expandedCode === c.code}
            onToggle={() => setExpandedCode(expandedCode === c.code ? null : c.code)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8">Keine Länder für diese Filter.</p>
        )}
      </div>

      {filterOpen && (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setFilterOpen(false)} />
          <div
            className="absolute bottom-0 inset-x-0 bg-dark-800 rounded-t-2xl border-t border-dark-500/60 p-4 space-y-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Filter</h2>
              <button type="button" onClick={() => setFilterOpen(false)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-xs text-slate-400">
              Region
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500 text-white text-sm min-h-[44px]"
              >
                <option value="all">Alle Regionen</option>
                {ALLOWED_COVERAGE_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-400">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CoverageStatus | 'all')}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500 text-white text-sm min-h-[44px]"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => { setRegionFilter('all'); setStatusFilter('all'); setSearch(''); setFilterOpen(false); }}
              className="w-full py-2.5 rounded-xl border border-dark-500 text-sm text-slate-400 min-h-[44px]"
            >
              Filter zurücksetzen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
