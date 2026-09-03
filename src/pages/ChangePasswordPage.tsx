import { KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';

const PHT_LOGO_URL = 'https://pht.group/wp-content/uploads/2026/05/PHT-Logo_4C.webp';

export function ChangePasswordPage() {
  const { user, loading, changePassword } = useAppAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const voluntary = new URLSearchParams(location.search).get('voluntary') === '1';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!loading && user && !user.mustChangePassword && !voluntary) {
    return <Navigate to="/command-center" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mindestens 6 Zeichen.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await changePassword(currentPassword, newPassword);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Passwortänderung fehlgeschlagen');
    } else {
      navigate('/command-center', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-dark-500/60 bg-dark-800/90 shadow-xl overflow-hidden">
        <div className="px-8 pt-8 pb-4 border-b border-dark-500/40 bg-white">
          <img src={PHT_LOGO_URL} alt="PHT Group" className="h-10 w-auto" />
        </div>
        <div className="px-8 py-8">
          <h1 className="text-xl font-semibold text-white mb-1">Passwort ändern</h1>
          <p className="text-sm text-slate-400 mb-6">
            Hallo {user?.name ?? user?.username} — bitte legen Sie ein persönliches Passwort fest, bevor Sie fortfahren.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500">Aktuelles Passwort</span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white text-sm focus:border-pht-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500">Neues Passwort</span>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white text-sm focus:border-pht-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500">Neues Passwort bestätigen</span>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white text-sm focus:border-pht-400 focus:outline-none"
              />
            </label>
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-pht-accent text-white font-medium hover:bg-pht-accent-hover disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {submitting ? 'Speichern…' : 'Passwort speichern'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
