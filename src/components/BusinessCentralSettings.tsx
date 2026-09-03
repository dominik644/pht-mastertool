import { ChevronDown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { CustomerPriority } from '../types/customerPriority';
import { fetchCustomerPriorities, getVisitState } from '../services/customerVisitStorage';
import { fetchBcSyncStatus, runBcSync, type BcSyncResult, type BcSyncStatus } from '../services/businessCentralSync';
import { Card, CardContent, CardHeader } from './ui/Card';

const SETUP_STEPS = [
  'Azure Portal → App-Registrierungen → Neue Registrierung (Typ: Web/API).',
  'API-Berechtigungen: „Dynamics 365 Business Central“ → Application permissions.',
  'BC_READ_ONLY (empfohlen): nur API.Read oder Financials.Read – KEIN API.ReadWrite.All in Production.',
  'Falls ReadWrite nötig für Stammdaten-Sync: App darf nur GET nutzen (im Code erzwungen, keine POST/PATCH/DELETE).',
  'Client Secret erstellen und notieren.',
  'In Business Central: Umgebungsname (z. B. Production) und Firmen-GUID ermitteln.',
  'In Vercel / .env.local: BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET, BC_ENVIRONMENT, BC_COMPANY_ID.',
  'Deployment neu starten. KV, Rechnungen & Konditionsvereinbarungen: READ-ONLY unter Kunden-Detail.',
];

export function BusinessCentralSettings() {
  const [status, setStatus] = useState<BcSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<(BcSyncResult & { mergedCount?: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchBcSyncStatus();
      setStatus(s);
      if (!s.configured) setSetupOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const data = await fetchCustomerPriorities();
      const customers = (data?.customers ?? []).map((c: CustomerPriority) => ({
        id: c.id,
        customerNumber: c.customerNumber,
        name: c.name,
        notes: getVisitState(c.id).notes,
      }));
      const { result, merged } = await runBcSync(customers);
      setLastResult({ ...result, mergedCount: merged });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synchronisation fehlgeschlagen');
    } finally {
      setSyncing(false);
    }
  };

  const configured = status?.configured ?? false;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white">Business Central</h2>
        <p className="text-xs text-slate-500 mt-1">
          Stammdaten-Sync · KV & Rechnungen READ-ONLY – serverseitig, kein Schreibzugriff auf Production-ERP
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Verbindungsstatus wird geprüft…</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                configured
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {configured ? 'Konfiguriert' : 'Nicht konfiguriert'}
            </span>
            {status?.environment && (
              <span className="text-xs text-slate-500">Umgebung: {status.environment}</span>
            )}
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={!configured || syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisiere…' : 'Jetzt synchronisieren'}
            </button>
            <button
              type="button"
              onClick={() => void refreshStatus()}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Status aktualisieren
            </button>
          </div>
        )}

        {status?.message && (
          <p className="text-xs text-slate-400">{status.message}</p>
        )}

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {lastResult && !error && (
          <div className="text-xs text-slate-400 space-y-1 rounded-lg border border-dark-500 bg-dark-700/50 p-3">
            {lastResult.syncedAt && (
              <p>Letzter Sync: {new Date(lastResult.syncedAt).toLocaleString('de-DE')}</p>
            )}
            {lastResult.bcCustomerCount != null && (
              <p>BC-Kunden geladen: {lastResult.bcCustomerCount}</p>
            )}
            {lastResult.mergedCount != null && lastResult.mergedCount > 0 && (
              <p className="text-emerald-400">{lastResult.mergedCount} Kunden-Stammdaten aktualisiert</p>
            )}
            {lastResult.matches && (
              <p>Zugeordnet: {lastResult.matches.length}{lastResult.unmatchedLocal?.length ? ` · ${lastResult.unmatchedLocal.length} lokal ohne BC-Treffer` : ''}</p>
            )}
            {lastResult.notesHint && (
              <p className="text-amber-400/80">{lastResult.notesHint}</p>
            )}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setSetupOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-pht-400 hover:text-pht-300"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${setupOpen ? 'rotate-180' : ''}`} />
            {configured ? 'Setup-Anleitung anzeigen' : 'Einrichtung in Azure & Business Central'}
          </button>
          {setupOpen && (
            <ol className="mt-3 space-y-2 text-xs text-slate-400 list-decimal list-inside">
              {SETUP_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
        </div>

        {!configured && !loading && (
          <p className="text-xs text-slate-500 border-t border-dark-600 pt-3">
            Ohne BC-Konfiguration können Sie Ansprechperson, Adressen und Firmen pro Kunde manuell unter
            {' '}<strong className="text-slate-400">Kunden-Priorität → Stammdaten</strong> pflegen (lokal im Browser).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
