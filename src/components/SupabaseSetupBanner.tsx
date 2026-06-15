import { Database, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const DISMISS_KEY = 'pht-mastertool-supabase-banner-dismissed';

export function SupabaseSetupBanner({ supabaseSkipped }: { supabaseSkipped: boolean }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );

  if (!supabaseSkipped || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
      <Database className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-sky-100 font-medium">Zentrale DB optional einrichten</p>
        <p className="text-xs text-sky-200/70 mt-0.5">
          Supabase speichert Tender teamweit und beschleunigt den täglichen Ingest.
          {' '}
          <Link to="/coverage#supabase" className="text-sky-300 hover:text-white underline underline-offset-2">
            Einrichtung ansehen
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="p-1.5 rounded-lg text-sky-300/70 hover:text-white hover:bg-sky-500/20 shrink-0"
        aria-label="Hinweis ausblenden"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
