import { Database, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';

const DISMISS_KEY = 'pht-pipeline-supabase-banner-dismissed';

/** Optionaler Hinweis: sales_pipeline-Tabelle für teamweiten Pipeline-Sync (nicht blockierend). */
export function PipelineSupabaseBanner() {
  const { supabaseSkipped } = useTenders();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );

  if (supabaseSkipped || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
      <Database className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-xs text-violet-100/90 space-y-1">
        <p className="font-medium text-sm text-violet-100">Pipeline-Sync optional (Supabase)</p>
        <p>
          Die Vertriebs-Pipeline liegt lokal im Browser. Für teamweiten Sync die Tabelle{' '}
          <code className="text-violet-200">sales_pipeline</code> anlegen – SQL in{' '}
          <code className="text-violet-200">supabase/schema.sql</code> (ab Zeile 46).
        </p>
        <Link to="/coverage#supabase" className="text-violet-300 hover:text-white underline underline-offset-2">
          Supabase-Einrichtung
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="p-1.5 rounded-lg text-violet-300/70 hover:text-white hover:bg-violet-500/20 shrink-0"
        aria-label="Hinweis ausblenden"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
