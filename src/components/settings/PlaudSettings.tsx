import { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../ui/Card';
import {
  connectPlaudAccount,
  fetchPlaudAccountStatus,
} from '../../services/plaudInbox';

export function PlaudSettings() {
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetchPlaudAccountStatus().then((s) => setConnected(s.connected));
  }, []);

  async function onSave() {
    if (!token.trim()) return;
    setBusy(true);
    const result = await connectPlaudAccount(token.trim());
    setBusy(false);
    setToken('');
    setConnected(result.connected);
    setMsg(result.connected ? 'Verbunden.' : (result.error || 'Nicht verbunden.'));
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Mic className="w-4 h-4 text-pht-300" />
          Plaud Note
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Kostenloser Abruf · Inbox:{' '}
          <Link to="/plaud" className="text-pht-400 hover:text-pht-300">Plaud-Notizen</Link>
          {connected ? ' · verbunden' : ' · einmal anmelden, dann kostenlos holen'}
        </p>
      </CardHeader>
      <CardContent>
        {connected ? (
          <p className="text-xs text-emerald-400">Verbunden. Aufnahmen kommen unter Plaud-Notizen automatisch an.</p>
        ) : (
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="refresh_token nach npx @plaud-ai/cli login"
            autoComplete="off"
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-500 text-xs text-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-2.5 py-1.5 rounded-lg bg-pht-600 text-white text-xs disabled:opacity-50"
          >
            {busy ? '…' : 'Speichern'}
          </button>
        </form>
        )}
        {msg && <p className="text-xs text-slate-400 mt-2">{msg}</p>}
      </CardContent>
    </Card>
  );
}
