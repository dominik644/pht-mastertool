import { Cloud, X } from 'lucide-react';
import { useState } from 'react';

const DISMISS_KEY = 'pht-cloud-ops-banner-dismissed';

/** Hinweis: Datenaktualisierung läuft serverseitig – kein lokaler PC nötig. */
export function CloudOperationsBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <Cloud className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-xs text-emerald-100/90 space-y-1">
        <p className="font-medium text-sm text-emerald-100">Cloud-Betrieb</p>
        <p>
          Daten aktualisieren sich täglich automatisch (Vercel + GitHub) – kein lokaler PC nötig.
        </p>
        <ul className="list-disc list-inside text-emerald-200/80 space-y-0.5 mt-1">
          <li>Vercel Cron 06:00 UTC – Live-Ingest aller Quellen → Supabase</li>
          <li>GitHub Actions 05:00 UTC – Bulk-Artefakte (Backup/Retry 06:00 UTC bei Fehler)</li>
          <li>GitHub Actions 07:00 UTC – Lead Discovery & Branchen-News</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="p-1.5 rounded-lg text-emerald-300/70 hover:text-white hover:bg-emerald-500/20 shrink-0"
        aria-label="Hinweis ausblenden"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
