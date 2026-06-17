import { Globe2, Loader2 } from 'lucide-react';
import { useTenders } from '../context/TenderContext';
import { isFastMode } from '../lib/startupFlags';

export function FastModeBanner() {
  const { fastMode, expandingSources, startFullWorldSearch, tenders, loading } = useTenders();

  if (!fastMode && !isFastMode()) return null;

  return (
    <div className="mx-3 sm:mx-6 mt-3 mb-1 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sky-200">Schnellmodus aktiv</p>
        <p className="text-xs text-sky-300/80 mt-0.5">
          {loading && tenders.length === 0
            ? 'Lädt die neuesten Treffer aus der zentralen Datenbank…'
            : `${tenders.length} Treffer aus Supabase · Live-Portale werden nicht automatisch abgefragt`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void startFullWorldSearch()}
        disabled={expandingSources || loading}
        className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-50 min-h-[44px]"
      >
        {expandingSources ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Weltweite Suche läuft…
          </>
        ) : (
          <>
            <Globe2 className="w-4 h-4" />
            Vollständige weltweite Suche starten
          </>
        )}
      </button>
    </div>
  );
}
