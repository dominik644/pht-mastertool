import { ExternalLink, FileText, RefreshCw, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBcSyncStatus } from '../../services/businessCentralSync';

interface BcDocument {
  id?: string;
  number?: string;
  orderDate?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmountIncludingTax?: number;
  currencyCode?: string;
  status?: string;
}

interface BcConditionAgreement {
  id?: string;
  number?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  bcUrl?: string | null;
}

interface CustomerBcDocumentsTabProps {
  customerNumber: string | null;
  bcCustomerNumber?: string;
}

type DocType = 'quote' | 'invoice' | 'conditionAgreement';

const DOC_TYPE_LABELS = {
  quote: { tab: 'Angebote (KV)', loading: 'Verkaufsangebote werden geladen…', empty: 'Keine Verkaufsangebote (KV) vorhanden.' },
  invoice: { tab: 'Rechnungen', loading: 'Rechnungen werden geladen…', empty: 'Keine Rechnungen vorhanden.' },
  conditionAgreement: {
    tab: 'Konditionsvereinbarungen',
    loading: 'Konditionsvereinbarungen werden geladen…',
    empty: 'Keine Konditionsvereinbarungen vorhanden.',
  },
} as const;

function formatAmount(value: number | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  const date = value.slice(0, 10);
  const [y, m, d] = date.split('-');
  return y && m && d ? `${d}.${m}.${y}` : date;
}

function latestDoc(docs: BcDocument[], dateField: 'orderDate' | 'invoiceDate'): BcDocument | undefined {
  if (!docs.length) return undefined;
  return [...docs].sort((a, b) => {
    const da = (a[dateField] ?? '').slice(0, 10);
    const db = (b[dateField] ?? '').slice(0, 10);
    return db.localeCompare(da);
  })[0];
}

function latestConditionAgreement(docs: BcConditionAgreement[]): BcConditionAgreement | undefined {
  if (!docs.length) return undefined;
  return [...docs].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))[0];
}

export function CustomerBcDocumentsTab({ customerNumber, bcCustomerNumber }: CustomerBcDocumentsTabProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [docType, setDocType] = useState<DocType>('quote');
  const [quotes, setQuotes] = useState<BcDocument[]>([]);
  const [invoices, setInvoices] = useState<BcDocument[]>([]);
  const [conditionAgreements, setConditionAgreements] = useState<BcConditionAgreement[]>([]);
  const [conditionHint, setConditionHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveNo = bcCustomerNumber || customerNumber;
  const labels = DOC_TYPE_LABELS[docType];
  const dateField = docType === 'quote' ? 'orderDate' : 'invoiceDate';

  useEffect(() => {
    void fetchBcSyncStatus().then((s) => setConfigured(s.configured)).catch(() => setConfigured(false));
  }, []);

  const loadDocs = useCallback(async () => {
    if (!effectiveNo || !configured) return;
    setLoading(true);
    setError(null);
    setConditionHint(null);
    try {
      const [quoteRes, invoiceRes, conditionRes] = await Promise.all([
        fetch(`/api/bc-documents?customerNo=${encodeURIComponent(effectiveNo)}&type=quote`),
        fetch(`/api/bc-documents?customerNo=${encodeURIComponent(effectiveNo)}&type=invoice`),
        fetch(`/api/bc-documents?customerNo=${encodeURIComponent(effectiveNo)}&type=conditionAgreement`),
      ]);
      const quoteData = await quoteRes.json();
      const invoiceData = await invoiceRes.json();
      const conditionData = await conditionRes.json();
      if (!quoteRes.ok && !invoiceRes.ok && !conditionRes.ok) {
        throw new Error(quoteData.error ?? invoiceData.error ?? conditionData.error ?? `HTTP ${quoteRes.status}`);
      }
      setQuotes(Array.isArray(quoteData.documents) ? quoteData.documents : []);
      setInvoices(Array.isArray(invoiceData.documents) ? invoiceData.documents : []);
      setConditionAgreements(Array.isArray(conditionData.documents) ? conditionData.documents : []);
      if (conditionData.supported === false && conditionData.hint) {
        setConditionHint(String(conditionData.hint));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
      setQuotes([]);
      setInvoices([]);
      setConditionAgreements([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveNo, configured]);

  useEffect(() => {
    if (configured && effectiveNo) void loadDocs();
  }, [configured, effectiveNo, loadDocs]);

  const lastQuote = useMemo(() => latestDoc(quotes, 'orderDate'), [quotes]);
  const lastInvoice = useMemo(() => latestDoc(invoices, 'invoiceDate'), [invoices]);
  const lastCondition = useMemo(() => latestConditionAgreement(conditionAgreements), [conditionAgreements]);

  if (configured === null) {
    return <p className="text-xs text-slate-500">Business-Central-Verbindung wird geprüft…</p>;
  }

  if (!configured) {
    return (
      <div className="rounded-lg border border-dark-500/60 bg-dark-800/40 p-3 space-y-2">
        <p className="text-xs text-slate-400">
          Business Central ist nicht konfiguriert – KV, Rechnungen und Konditionsvereinbarungen nach Setup verfügbar.
        </p>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-pht-400 hover:text-pht-300"
        >
          <Settings className="w-3.5 h-3.5" />
          BC in Einstellungen einrichten
        </Link>
      </div>
    );
  }

  if (!effectiveNo) {
    return (
      <p className="text-xs text-slate-500">
        Keine Kundennummer hinterlegt – BC-Sync oder Stammdaten pflegen.
      </p>
    );
  }

  const docCounts: Record<DocType, number> = {
    quote: quotes.length,
    invoice: invoices.length,
    conditionAgreement: conditionAgreements.length,
  };

  return (
    <div className="space-y-3">
      {(lastQuote || lastInvoice || lastCondition) && (
        <div className="rounded-lg border border-dark-500/50 bg-dark-800/30 px-3 py-2 space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">BC-Zusammenfassung</p>
          <p className="text-xs text-slate-300">
            Letztes KV:{' '}
            <span className="text-white tabular-nums">{formatDate(lastQuote?.orderDate)}</span>
            {' / '}
            <span className="text-emerald-400 tabular-nums">
              {formatAmount(lastQuote?.totalAmountIncludingTax)} {lastQuote?.currencyCode ?? 'EUR'}
            </span>
          </p>
          <p className="text-xs text-slate-300">
            Letzte Rechnung:{' '}
            <span className="text-white tabular-nums">{formatDate(lastInvoice?.invoiceDate)}</span>
            {' / '}
            <span className="text-emerald-400 tabular-nums">
              {formatAmount(lastInvoice?.totalAmountIncludingTax)} {lastInvoice?.currencyCode ?? 'EUR'}
            </span>
          </p>
          {lastCondition && (
            <p className="text-xs text-slate-300">
              Letzte Konditionsvereinbarung:{' '}
              <span className="text-white font-mono">{lastCondition.number ?? '—'}</span>
              {' · '}
              <span className="text-slate-400">{formatDate(lastCondition.startDate)}</span>
              {lastCondition.status ? (
                <>
                  {' · '}
                  <span className="text-slate-400">{lastCondition.status}</span>
                </>
              ) : null}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          BC-Dokumente (nur Lesen)
        </p>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          READ-ONLY
        </span>
        <div className="flex flex-wrap gap-1 ml-auto">
          {(['quote', 'invoice', 'conditionAgreement'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDocType(t)}
              className={`px-2 py-1 rounded text-xs ${
                docType === t ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {DOC_TYPE_LABELS[t].tab}
              {docCounts[t] > 0 && (
                <span className="ml-1 opacity-75">({docCounts[t]})</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void loadDocs()}
            disabled={loading}
            className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-50"
            aria-label="Aktualisieren"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">
          Fehler beim Laden: {error}
        </p>
      )}

      {docType === 'conditionAgreement' && conditionHint && (
        <p className="text-xs text-amber-400/90 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
          {conditionHint}
        </p>
      )}

      {docType === 'conditionAgreement' ? (
        <ConditionAgreementsTable
          docs={conditionAgreements}
          loading={loading}
          emptyLabel={labels.empty}
          effectiveNo={effectiveNo}
        />
      ) : (
        <SalesDocumentsTable
          docs={docType === 'quote' ? quotes : invoices}
          docType={docType}
          dateField={dateField}
          loading={loading}
          labels={labels}
          effectiveNo={effectiveNo}
        />
      )}
    </div>
  );
}

function SalesDocumentsTable({
  docs,
  docType,
  dateField,
  loading,
  labels,
  effectiveNo,
}: {
  docs: BcDocument[];
  docType: 'quote' | 'invoice';
  dateField: 'orderDate' | 'invoiceDate';
  loading: boolean;
  labels: (typeof DOC_TYPE_LABELS)[keyof typeof DOC_TYPE_LABELS];
  effectiveNo: string;
}) {
  if (loading && docs.length === 0) {
    return <p className="text-xs text-slate-500">{labels.loading}</p>;
  }
  if (docs.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        {labels.empty} (Kunde {effectiveNo})
      </p>
    );
  }
  return (
    <>
      <p className="text-[10px] text-slate-500">
        {docs.length} {docType === 'quote' ? 'Angebot' : 'Rechnung'}{docs.length === 1 ? '' : docType === 'quote' ? 'e' : 'en'} · Kunde {effectiveNo}
      </p>
      <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-dark-600/60">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-dark-800 z-10">
            <tr className="text-slate-500 border-b border-dark-600">
              <th className="text-left py-2 px-2 font-medium">Nummer</th>
              <th className="text-left py-2 px-2 font-medium">Datum</th>
              <th className="text-right py-2 px-2 font-medium">Betrag</th>
              <th className="text-left py-2 px-2 font-medium">Währung</th>
              <th className="text-left py-2 px-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id ?? d.number} className="border-b border-dark-700/50 text-slate-300 hover:bg-dark-700/30">
                <td className="py-1.5 px-2 font-mono">{d.number ?? '—'}</td>
                <td className="py-1.5 px-2 whitespace-nowrap">
                  {formatDate(d[dateField as keyof BcDocument] as string | undefined)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">
                  {formatAmount(d.totalAmountIncludingTax)}
                </td>
                <td className="py-1.5 px-2">{d.currencyCode ?? 'EUR'}</td>
                <td className="py-1.5 px-2">{d.status ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && (
        <p className="text-[10px] text-slate-500">Aktualisiere…</p>
      )}
    </>
  );
}

function ConditionAgreementsTable({
  docs,
  loading,
  emptyLabel,
  effectiveNo,
}: {
  docs: BcConditionAgreement[];
  loading: boolean;
  emptyLabel: string;
  effectiveNo: string;
}) {
  if (loading && docs.length === 0) {
    return <p className="text-xs text-slate-500">Konditionsvereinbarungen werden geladen…</p>;
  }
  if (docs.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        {emptyLabel} (Kunde {effectiveNo})
      </p>
    );
  }
  return (
    <>
      <p className="text-[10px] text-slate-500">
        {docs.length} Konditionsvereinbarung{docs.length === 1 ? '' : 'en'} · Kunde {effectiveNo}
      </p>
      <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-dark-600/60">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-dark-800 z-10">
            <tr className="text-slate-500 border-b border-dark-600">
              <th className="text-left py-2 px-2 font-medium">Nummer</th>
              <th className="text-left py-2 px-2 font-medium">Von</th>
              <th className="text-left py-2 px-2 font-medium">Bis</th>
              <th className="text-left py-2 px-2 font-medium">Beschreibung</th>
              <th className="text-left py-2 px-2 font-medium">Status</th>
              <th className="text-left py-2 px-2 font-medium w-8" aria-label="BC öffnen" />
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id ?? d.number} className="border-b border-dark-700/50 text-slate-300 hover:bg-dark-700/30">
                <td className="py-1.5 px-2 font-mono">{d.number ?? '—'}</td>
                <td className="py-1.5 px-2 whitespace-nowrap">{formatDate(d.startDate)}</td>
                <td className="py-1.5 px-2 whitespace-nowrap">{formatDate(d.endDate)}</td>
                <td className="py-1.5 px-2 max-w-[12rem] truncate" title={d.description}>
                  {d.description || '—'}
                </td>
                <td className="py-1.5 px-2">{d.status || '—'}</td>
                <td className="py-1.5 px-2">
                  {d.bcUrl ? (
                    <a
                      href={d.bcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pht-400 hover:text-pht-300 inline-flex"
                      title="In Business Central öffnen"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && (
        <p className="text-[10px] text-slate-500">Aktualisiere…</p>
      )}
    </>
  );
}
