import { useState } from 'react';
import { Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../ui/Card';

const INBOX_SQL = `create table if not exists public.plaud_inbox (
  id text primary key,
  payload jsonb not null,
  status text not null default 'pending',
  received_at timestamptz not null default now()
);
create index if not exists plaud_inbox_status_idx on public.plaud_inbox (status);
alter table public.plaud_inbox enable row level security;
drop policy if exists "service manage plaud_inbox" on public.plaud_inbox;
create policy "service manage plaud_inbox"
  on public.plaud_inbox for all to service_role using (true) with check (true);`;

export function PlaudSettings() {
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/api/plaud`
    : 'https://pht-mastertool.vercel.app/api/plaud';
  const [copied, setCopied] = useState<'url' | 'sql' | null>(null);

  async function copy(kind: 'url' | 'sql', text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Mic className="w-4 h-4 text-pht-300" />
          Plaud Note
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Im Tool:{' '}
          <Link to="/plaud" className="text-pht-400 hover:text-pht-300">Plaud-Notizen</Link>
          {' '}— Transkripte & Summaries aus dem Plaud-Gerät.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-slate-400">
        <p>
          <strong className="text-slate-300">Setup:</strong> Plaud Web → Explore → Integrations → Zapier.
          Trigger: <strong className="text-slate-300">Transcript & Summary Ready</strong>.
        </p>
        <p>
          Action: <strong className="text-slate-300">Webhooks by Zapier → POST</strong> an{' '}
          <code className="text-pht-300 break-all">{url}</code>
          {' '}
          <button
            type="button"
            className="text-pht-400 hover:text-pht-300"
            onClick={() => void copy('url', url)}
          >
            {copied === 'url' ? 'kopiert' : 'URL kopieren'}
          </button>
        </p>
        <p>
          Header: <code className="text-slate-300">Authorization: Bearer …</code>
          (gleicher Wert wie <code className="text-slate-300">PLAUD_WEBHOOK_SECRET</code> in Vercel / .env.local).
          Alternativ denselben Schlüssel als <code className="text-slate-300">?token=…</code> an die URL hängen.
        </p>
        <p>
          Felder mappen: <code className="text-slate-300">title</code>,{' '}
          <code className="text-slate-300">transcript</code>,{' '}
          <code className="text-slate-300">summary</code>, optional{' '}
          <code className="text-slate-300">actionItems</code>,{' '}
          <code className="text-slate-300">recordedAt</code>.
        </p>
        <p>
          Speicherung: Supabase-Tabelle <code className="text-slate-300">plaud_inbox</code>.
          Einmal im SQL Editor ausführen:
        </p>
        <pre className="text-[10px] leading-relaxed bg-dark-900 border border-dark-500/50 rounded-lg p-2 overflow-x-auto text-slate-300 whitespace-pre-wrap">{INBOX_SQL}</pre>
        <button
          type="button"
          className="text-pht-400 hover:text-pht-300"
          onClick={() => void copy('sql', INBOX_SQL)}
        >
          {copied === 'sql' ? 'SQL kopiert' : 'SQL kopieren'}
        </button>
      </CardContent>
    </Card>
  );
}
