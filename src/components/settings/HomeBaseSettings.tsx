import { Home, MapPin } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppAuth } from '../../context/AppAuthContext';
import { DEFAULT_HOME_BASE } from '../../lib/territoryConfig';
import {
  buildHomeBaseFromAddress,
  loadHomeBaseForUser,
  loadUserHomeBase,
  resolveHomeBaseUserKey,
  saveUserHomeBase,
  type UserHomeBase,
} from '../../services/userHomeBase';
import { Card, CardContent, CardHeader } from '../ui/Card';

export function HomeBaseSettings() {
  const { user } = useAppAuth();
  const userKey = useMemo(
    () => resolveHomeBaseUserKey(user?.email, user?.username, user?.name),
    [user],
  );

  const [draft, setDraft] = useState<UserHomeBase>(() =>
    loadUserHomeBase(userKey) ?? loadHomeBaseForUser(user?.email, user?.username, user?.name),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    setDraft(loadUserHomeBase(userKey) ?? loadHomeBaseForUser(user?.email, user?.username, user?.name));
  }, [userKey, user?.email, user?.username, user?.name]);

  const handleSave = useCallback(async () => {
    setGeocoding(true);
    setError(null);
    const result = await buildHomeBaseFromAddress({
      name: draft.name,
      street: draft.street,
      zip: draft.zip,
      city: draft.city,
      country: draft.country,
    });
    setGeocoding(false);
    if (!result.geocoded) {
      setError(result.error ?? 'Geocoding fehlgeschlagen');
      return;
    }
    saveUserHomeBase(userKey, result.base);
    setDraft(result.base);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }, [draft, userKey]);

  const handleReset = () => {
    const base: UserHomeBase = { ...DEFAULT_HOME_BASE, country: 'AT' };
    saveUserHomeBase(userKey, base);
    setDraft(base);
    setError(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Home className="w-4 h-4 text-pht-400" />
          Wohnadresse / Startpunkt Touren
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Für Wegstrecken und Tagesplanung in der{' '}
          <Link to="/priorities?view=map" className="text-pht-400 hover:text-pht-300">
            Tourenplanung
          </Link>
          . Pro Benutzer gespeichert (lokal). Termine: 1&nbsp;h · Mittags- und Kaffeepausen werden eingeplant.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="block">
          <span className="text-xs text-slate-500">Bezeichnung</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="z. B. Zuhause"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500">Straße (optional)</span>
          <input
            value={draft.street ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, street: e.target.value }))}
            placeholder="Musterstraße 1"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
          />
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <label className="block">
            <span className="text-xs text-slate-500">PLZ</span>
            <input
              value={draft.zip}
              onChange={(e) => setDraft((d) => ({ ...d, zip: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
            />
          </label>
          <label className="block col-span-1 sm:col-span-2">
            <span className="text-xs text-slate-500">Ort</span>
            <input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-slate-500">Land</span>
          <select
            value={draft.country ?? 'AT'}
            onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white"
          >
            <option value="AT">Österreich</option>
            <option value="DE">Deutschland</option>
            <option value="CH">Schweiz</option>
          </select>
        </label>

        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          Koordinaten nach Speichern: {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
        </p>

        {error && <p className="text-xs text-amber-400">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={geocoding || !draft.zip.trim() || !draft.city.trim()}
            className="px-4 py-2 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700 disabled:opacity-50"
          >
            {geocoding ? 'Berechne…' : 'Speichern & geocodieren'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-dark-500 text-sm text-slate-400 hover:text-white"
          >
            Standard (Pitten)
          </button>
          {saved && <span className="text-xs text-emerald-400 self-center">Gespeichert</span>}
        </div>
      </CardContent>
    </Card>
  );
}
