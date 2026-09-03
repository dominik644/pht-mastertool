import { ExternalLink, Plus, Shield, Trash2, UserPlus } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useAppAuth } from '../context/AppAuthContext';
import { fetchBcSalesTeam } from '../services/bcSalesTeam';
import type { BcSalesperson } from '../types/bcSalesTeam';
import { Card, CardContent } from './ui/Card';

interface ManagedUser {
  email: string;
  username?: string;
  name?: string;
  admin: boolean;
  disabled: boolean;
  bcSalespersonCode?: string | null;
  salesRep?: string | null;
  source: string;
  editable: boolean;
}

export function AppUsersSettings() {
  const { user } = useAppAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [salespeople, setSalespeople] = useState<BcSalesperson[]>([]);
  const [dbEnabled, setDbEnabled] = useState(false);
  const [envOnly, setEnvOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [newBcCode, setNewBcCode] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/users', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Benutzer konnten nicht geladen werden');
        return;
      }
      setUsers(data.users ?? []);
      setDbEnabled(Boolean(data.dbEnabled));
      setEnvOnly(Boolean(data.envOnly));
    } catch {
      setError('Verbindung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.admin) {
      void loadUsers();
      void fetchBcSalesTeam()
        .then((team) => setSalespeople(team.salespeople))
        .catch(() => setSalespeople([]));
    } else {
      setLoading(false);
    }
  }, [user?.admin, loadUsers]);

  if (!user?.admin) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-slate-400">
            Zugangsverwaltung ist nur für Administratoren verfügbar.
            {user ? ` Angemeldet als ${user.email}.` : ''}
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedSp = salespeople.find((sp) => sp.code === newBcCode);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (newRole === 'user' && !newBcCode && !newName.trim()) {
      setError('Für Nutzer: Name oder BC-Verkäufercode angeben');
      return;
    }
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        name: newName || selectedSp?.name || undefined,
        admin: newRole === 'admin',
        bcSalespersonCode: newRole === 'user' ? (newBcCode || undefined) : undefined,
        salesRep: newRole === 'user' ? (selectedSp?.name ?? newName ?? undefined) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Benutzer konnte nicht angelegt werden');
      return;
    }
    setNewEmail('');
    setNewPassword('');
    setNewName('');
    setNewRole('user');
    setNewBcCode('');
    setStatus('Benutzer angelegt');
    setError(null);
    await loadUsers();
  };

  const toggleRole = async (u: ManagedUser) => {
    if (!u.editable) return;
    const res = await fetch('/api/auth/users', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, admin: !u.admin }),
    });
    if (res.ok) await loadUsers();
  };

  const toggleDisabled = async (u: ManagedUser) => {
    if (!u.editable) return;
    const res = await fetch('/api/auth/users', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, disabled: !u.disabled }),
    });
    if (res.ok) await loadUsers();
  };

  const removeUser = async (u: ManagedUser) => {
    if (!u.editable || !window.confirm(`${u.email} wirklich entfernen?`)) return;
    const res = await fetch('/api/auth/users', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email }),
    });
    if (res.ok) await loadUsers();
  };

  return (
    <div className="space-y-4">
      {envOnly && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
          <p className="font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Env-Benutzer (nur lesen)
          </p>
          <p className="mt-1 text-xs text-amber-200/70">
            Benutzer aus <code className="text-amber-100">APP_USERS</code> werden in Vercel gepflegt
            (Felder: <code className="text-amber-100">admin</code>, <code className="text-amber-100">bcSalespersonCode</code>, <code className="text-amber-100">salesRep</code>, <code className="text-amber-100">name</code>).
            Für CRUD in der App: Supabase-Tabelle <code className="text-amber-100">app_users</code>.
          </p>
          <a
            href="https://vercel.com/docs/projects/environment-variables"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
          >
            Vercel Env-Dokumentation
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {dbEnabled && (
        <Card>
          <CardContent className="py-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-pht-400" />
              Neuen Zugang anlegen
            </h3>
            <form onSubmit={(e) => void handleAdd(e)} className="grid gap-3 sm:grid-cols-2">
              <input
                type="email"
                required
                placeholder="E-Mail"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
              />
              <input
                type="password"
                required
                placeholder="Passwort"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Anzeigename"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                className="px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
              >
                <option value="user">Nutzer (eigenes Gebiet)</option>
                <option value="admin">Administrator (voller Zugriff)</option>
              </select>
              {newRole === 'user' && (
                <select
                  value={newBcCode}
                  onChange={(e) => setNewBcCode(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
                >
                  <option value="">BC-Verkäufer wählen (optional)</option>
                  {salespeople.map((sp) => (
                    <option key={sp.code} value={sp.code}>
                      {sp.name} ({sp.code}) · {sp.customerCount} Kunden
                    </option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                className="sm:col-span-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-pht-accent text-white text-sm font-medium hover:bg-pht-accent-hover"
              >
                <Plus className="w-4 h-4" />
                Benutzer hinzufügen
              </button>
            </form>
            {status && <p className="mt-2 text-xs text-pht-300">{status}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <h3 className="text-sm font-semibold text-white mb-3">Aktive Zugänge</h3>
          {loading && <p className="text-sm text-slate-500">Lade…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && users.length === 0 && (
            <p className="text-sm text-slate-500">Keine Benutzer konfiguriert.</p>
          )}
          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={u.email}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dark-500/50 bg-dark-900/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {u.name ? `${u.name}` : u.email}
                    {u.username && (
                      <span className="text-slate-400"> · {u.username}</span>
                    )}
                    {u.admin
                      ? <span className="ml-2 text-[10px] uppercase text-pht-400">Admin</span>
                      : <span className="ml-2 text-[10px] uppercase text-slate-500">Nutzer</span>}
                    {u.disabled && <span className="ml-2 text-[10px] uppercase text-red-400">Deaktiviert</span>}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Quelle: {u.source === 'file' ? 'App-Benutzerliste' : u.source === 'env' ? 'Vercel APP_USERS' : 'Supabase'}
                    {!u.admin && (u.bcSalespersonCode || u.salesRep) && (
                      <> · Gebiet: {u.bcSalespersonCode ?? u.salesRep}</>
                    )}
                  </p>
                </div>
                {u.editable && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleRole(u)}
                      className="text-[10px] px-2 py-1 rounded border border-dark-500 text-slate-400 hover:text-white"
                    >
                      {u.admin ? '→ Nutzer' : '→ Admin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleDisabled(u)}
                      className="text-[10px] px-2 py-1 rounded border border-dark-500 text-slate-400 hover:text-white"
                    >
                      {u.disabled ? 'Aktivieren' : 'Deaktivieren'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeUser(u)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
