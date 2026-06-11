import { useMemo, useState } from 'react';
import { ExternalLink, Globe2, Search, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useTenders } from '../context/TenderContext';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function HighlightCard({ country, onSelect }: { country: MergedCountryCoverage; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-400/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{country.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{country.region} · {country.tenderCount} Treffer live</p>
        </div>
        <Badge variant="danger">Lücke</Badge>
      </div>
      <p className="text-sm text-slate-300 mt-2">{country.notes}</p>
      {country.portalUrl && (
        <p className="text-xs text-pht-400 mt-2 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          {country.portalName ?? country.portalUrl}
        </p>
      )}
    </button>
  );
}

function CountryRow({
  country,
  expanded,
  onToggle,
}: {
  country: MergedCountryCoverage;
  expanded: boolean;
  onToggle: () => void;
}) {
  const providerText = country.liveProviders.length
    ? country.liveProviders.join(', ')
    : country.providers.join(', ') || '—';

  return (
    <>
      <tr
        id={`country-row-${country.code}`}
        className={`border-b border-dark-500/40 hover:bg-dark-600/30 cursor-pointer transition-colors ${
          country.highlight ? 'bg-red-500/5' : ''
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            <span className="text-sm font-medium text-white">{country.name}</span>
            {country.highlight && (
              <span className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">Priorität</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-400">{country.region}</td>
        <td className="px-4 py-3 text-sm text-slate-300 tabular-nums">{country.tenderCount}</td>
        <td className="px-4 py-3 text-sm text-slate-400 max-w-[200px] truncate" title={providerText}>{providerText}</td>
        <td className="px-4 py-3">
          <Badge variant={statusVariant(country.effectiveStatus)}>{statusLabel(country.effectiveStatus)}</Badge>
        </td>
        <td className="px-4 py-3 text-sm text-slate-400 max-w-[220px] truncate">
          {country.portalName ?? '—'}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-dark-800/80">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Nächste Schritte</p>
                <ul className="space-y-1.5 text-slate-300">
                  {country.actionPlan.map((step) => (
                    <li key={step} className="flex gap-2">
                      <span className="text-pht-400 shrink-0">→</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Hinweise</p>
                <p className="text-slate-300">{country.notes}</p>
                {country.portalUrl && (
                  <a
                    href={country.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-pht-400 hover:text-pht-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {country.portalName ?? 'Vergabeportal öffnen'}
                  </a>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function CountryCoveragePage() {
  const { allTenders, loading, dataSource } = useTenders();
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<CoverageStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const merged = useMemo(() => mergeCountryCoverage(allTenders), [allTenders]);
  const stats = useMemo(() => coverageStats(merged), [merged]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return merged
      .filter((c) => {
        if (regionFilter !== 'all' && c.region !== regionFilter) return false;
        if (statusFilter !== 'all' && c.effectiveStatus !== statusFilter) return false;
        if (q && !c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q) && !c.region.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort(sortByStatus);
  }, [merged, regionFilter, statusFilter, search]);

  const selectCountry = (code: string) => {
    setExpandedCode(code);
    setSearch('');
    setStatusFilter('all');
    const el = document.getElementById(`country-row-${code}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-pht-600/20 border border-pht-500/30 flex items-center justify-center">
            <Globe2 className="w-5 h-5 text-pht-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
              Länder-Abdeckung
              {!loading && (
                <Badge variant="muted">
                  {allTenders.length} Treffer live
                </Badge>
              )}
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Vergabeportale weltweit (ohne USA & Asien) – Lücken vs. live Daten
            </p>
          </div>
        </div>
        {dataSource && (
          <p className="text-xs text-slate-500 mt-2">Live-Quellen: {dataSource}</p>
        )}
        <p className="text-xs text-slate-500 mt-2 max-w-3xl">
          Einige Märkte (z. B. Ungarn/EKR, Norwegen/Doffin) sind bewusst nur über TED bzw. manuell abgedeckt –
          ohne öffentliche API oder API-Key ist keine Live-Anbindung möglich.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Länder gesamt" value={stats.total} color="text-white" />
        <StatCard label="Abgedeckt" value={stats.covered} color="text-emerald-400" />
        <StatCard label="Teilweise (TED)" value={stats.partial} color="text-amber-400" />
        <StatCard label="Lücken" value={stats.gaps} color="text-red-400" />
      </div>

      {stats.highlighted.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-white">Prioritäts-Lücken zur Prüfung</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.highlighted.map((c) => (
              <HighlightCard key={c.code} country={c} onSelect={() => selectCountry(c.code)} />
            ))}
          </div>
        </section>
      )}

      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Land suchen…"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark-600 border border-dark-500 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pht-500/50"
              />
            </div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-dark-600 border border-dark-500 text-sm text-white focus:outline-none focus:border-pht-500/50"
            >
              <option value="all">Alle Regionen</option>
              {ALLOWED_COVERAGE_REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CoverageStatus | 'all')}
              className="px-3 py-2.5 rounded-lg bg-dark-600 border border-dark-500 text-sm text-white focus:outline-none focus:border-pht-500/50"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white">
            {loading ? 'Lade Tender-Daten…' : `${filtered.length} Länder`}
          </h2>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-dark-500/50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Land</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Region</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Treffer</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Provider</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Portal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <CountryRow
                  key={c.code}
                  country={c}
                  expanded={expandedCode === c.code}
                  onToggle={() => setExpandedCode(expandedCode === c.code ? null : c.code)}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">Keine Länder für diese Filter.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
