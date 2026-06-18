import { Database, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/Card';

export function SupabaseSetupCard() {
  return (
    <div id="supabase">
    <Card className="mb-8 border-sky-500/30">
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400" />
          Zentrale Datenbank (optional)
        </h2>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-300">
        <p>
          Ohne Supabase lädt das Tool Tender live von den Vergabeportalen (Browser-Cache + Bulk-JSON).
          Mit Supabase speichert der tägliche Ingest alle Treffer zentral – schnellerer Start und teamweiter Stand.
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400">
          <li>Projekt auf <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-pht-400 hover:text-pht-300">supabase.com</a> anlegen</li>
          <li><code className="text-slate-300">supabase/schema.sql</code> im SQL Editor ausführen (inkl. <code className="text-slate-300">sales_pipeline</code> ab Zeile 46)</li>
          <li>In Vercel: <code className="text-slate-300">SUPABASE_URL</code>, <code className="text-slate-300">SUPABASE_SERVICE_KEY</code>, <code className="text-slate-300">SUPABASE_ANON_KEY</code></li>
          <li>Cron <code className="text-slate-300">/api/ingest</code> füllt die DB (täglich 06:00 UTC)</li>
        </ol>
        <p className="text-xs text-slate-500">
          Lokal: gleiche Variablen in <code className="text-slate-400">.env.local</code> – siehe <code className="text-slate-400">.env.local.example</code>
        </p>
        <a
          href="https://supabase.com/docs/guides/getting-started"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-pht-400 hover:text-pht-300"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Supabase Quickstart
        </a>
      </CardContent>
    </Card>
    </div>
  );
}
