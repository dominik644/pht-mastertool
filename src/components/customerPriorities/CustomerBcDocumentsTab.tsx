import { FileText, RefreshCw, Settings } from 'lucide-react';
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

interface CustomerBcDocumentsTabProps {
  customerNumber: string | null;
  bcCustomerNumber?: string;
}

const DOC_TYPE_LABELS = {
  quote: { tab: 'Angebote (KV)', loading: 'Verkaufsangebote werden geladen…', empty: 'Keine Verkaufsangebote (KV) vorhanden.' },
  invoice: { tab: 'Rechnungen', loading: 'Rechnungen werden geladen…', empty: 'Keine Rechnungen vorhanden.' },
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

export function CustomerBcDocumentsTab({ customerNumber, bcCustomerNumber }: CustomerBcDocumentsTabProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [docType, setDocType] = useState<'quote' | 'invoice'>('quote');
  const [quotes, setQuotes] = useState<BcDocument[]>([]);
  const [invoices, setInvoices] = useState<BcDocument[]>([]);
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
    try {
      const [quoteRes, invoiceRes] = await Promise.all([
        fetch(`/api/bc-documents?customerNo=${encodeURIComponent(effectiveNo)}&type=quote`),
        fetch(`/api/bc-documents?customerNo=${encodeURIComponent(effectiveNo)}&type=invoice`),
      ]);
      const quoteData = await quoteRes.json();
      const invoiceData = await invoiceRes.json();
      if (!quoteRes.ok && !invoiceRes.ok) {
        throw new Error(quoteData.error ?? invoiceData.error ?? `HTTP ${quoteRes.status}`);
      }
      setQuotes(Array.isArray(quoteData.documents) ? quoteData.documents : []);
      setInvoices(Array.isArray(invoiceData.documents) ? invoiceData.documents : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
      setQuotes([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveNo, configured]);

  useEffect(() => {
    if (configured && effectiveNo) void loadDocs();
  }, [configured, effectiveNo, loadDocs]);

  const docs = docType === 'quote' ? quotes : invoices;
  const lastQuote = useMemo(() => latestDoc(quotes, 'orderDate'), [quotes]);
  const lastInvoice = useMemo(() => latestDoc(invoices, 'invoiceDate'), [invoices]);

  if (configured === null) {
    return <p className="text-xs text-slate-500">Business-Central-Verbindung wird geprüft…</p>;
  }

  if (!configured) {
    return (
      <div className="rounded-lg border border-dark-500/60 bg-dark-800/40 p-3 space-y-2">
        <p className="text-xs text-slate-400">
          Business Central ist nicht konfiguriert – KV und Rechnungen nach Setup verfügbar.
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

  return (
    <div className="space-y-3">
      {(lastQuote || lastInvoice) && (
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
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          KV &amp; Rechnungen (nur Lesen)
        </p>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          READ-ONLY
        </span>
        <div className="flex gap-1 ml-auto">
          {(['quote', 'invoice'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDocType(t)}
              className={`px-2 py-1 rounded text-xs ${
                docType === t ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {DOC_TYPE_LABELS[t].tab}
              {(t === 'quote' ? quotes.length : invoices.length) > 0 && (
                <span className="ml-1 opacity-75">({t === 'quote' ? quotes.length : invoices.length})</span>
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

      {loading && docs.length === 0 ? (
        <p className="text-xs text-slate-500">{labels.loading}</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-slate-500">
          {labels.empty} (Kunde {effectiveNo})
        </p>
      ) : (
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
      )}
    </div>
  );
}
