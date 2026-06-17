import { Globe2, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTenders } from '../context/TenderContext';

export function FastModeBanner() {
  const {
    fastMode,
    expandingSources,
    startFullWorldSearch,
    tenders,
    loading,
    totalCount,
    refreshTenders,
  } = useTenders();
  const [ingestInfo, setIngestInfo] = useState<string | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);

  if (!fastMode) return null;

  const handleIngestInfo = async () => {
    setIngestLoading(true);
    setIngestInfo(null);
    try {
      const res = await fetch('/api/ingest', { method: 'GET' });
      if (res.status === 401) {
        setIngestInfo(
          'Alle 27 Quellen werden täglich serverseitig aktualisiert (Cron 06:00 UTC). ' +
            'Manueller Ingest ist nur mit Admin-Berechtigung möglich – Daten kommen aus Supabase.',
        );
        await refreshTenders({ page: 1 });
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setIngestInfo(
          `Ingest abgeschlossen: ${body.total ?? '—'} Ausschreibungen von ${body.providerCount ?? '—'} Quellen. ` +
            'Liste wird neu geladen…',
        );
        await refreshTenders({ page: 1 });
      } else {
        setIngestInfo(
          body.error ??
            'Hintergrund-Ingest läuft täglich automatisch. Aktuelle Daten werden aus Supabase geladen.',
        );
        await refreshTenders({ page: 1 });
      }
    } catch {
      setIngestInfo(
        'Hintergrund-Ingest läuft täglich serverseitig (Cron). Aktuelle Daten werden aus Supabase geladen.',
      );
      await refreshTenders({ page: 1 });
    } finally {
      setIngestLoading(false);
    }
  };

  const loadedLabel = totalCount > 0 ? `${tenders.length} von ~${totalCount}` : `${tenders.length}`;

  return (
    <div className="mx-3 sm:mx-6 mt-3 mb-1 flex flex-col gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sky-200">Schnellmodus aktiv</p>
          <p className="text-xs text-sky-300/80 mt-0.5">
            {loading && tenders.length === 0
              ? 'Lädt die neuesten Treffer aus der zentralen Datenbank…'
              : `${loadedLabel} Treffer aus Supabase · Live-Portale nur serverseitig (Ingest)`}
          </p>
          {ingestInfo && (
            <p className="text-xs text-sky-200/90 mt-2 leading-relaxed">{ingestInfo}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleIngestInfo()}
            disabled={ingestLoading || loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-50 min-h-[44px]"
          >
            {ingestLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Aktualisiere…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Alle Quellen aktualisieren
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void startFullWorldSearch()}
            disabled={expandingSources || loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-sky-500/40 text-sky-200 text-sm hover:bg-sky-500/10 disabled:opacity-50 min-h-[44px]"
          >
            {expandingSources ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Live-Suche…
              </>
            ) : (
              <>
                <Globe2 className="w-4 h-4" />
                Live-Suche (langsam)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
