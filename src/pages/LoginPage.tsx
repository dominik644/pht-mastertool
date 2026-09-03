import { LogIn } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';

const PHT_LOGO_URL = 'https://pht.group/wp-content/uploads/2026/05/PHT-Logo_4C.webp';

export function LoginPage() {
  const { user, loading, login, configured } = useAppAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/command-center';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(result.error ?? 'Anmeldung fehlgeschlagen');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-dark-500/60 bg-dark-800/90 shadow-xl overflow-hidden">
        <div className="px-8 pt-8 pb-4 border-b border-dark-500/40 bg-white">
          <img src={PHT_LOGO_URL} alt="PHT Group" className="h-10 w-auto" />
        </div>
        <div className="px-8 py-8">
          <h1 className="text-xl font-semibold text-white mb-1">PHT Mastertool</h1>
          <p className="text-sm text-slate-400 mb-6">Bitte melden Sie sich an, um fortzufahren.</p>

          {!configured && !loading && (
            <p className="mb-4 text-xs text-amber-400/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              App-Login ist noch nicht konfiguriert. In Vercel <code className="text-amber-200">APP_USERS</code> und{' '}
              <code className="text-amber-200">APP_SESSION_SECRET</code> setzen.
            </p>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500">E-Mail</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white text-sm focus:border-pht-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500">Passwort</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg bg-dark-900 border border-dark-500 text-white text-sm focus:border-pht-400 focus:outline-none"
              />
            </label>
            {error && (
              <p className="text-sm text-red-400" role="alert">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-pht-accent text-white font-medium hover:bg-pht-accent-hover disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
