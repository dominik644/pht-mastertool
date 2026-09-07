import { LogIn } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';

const PHT_LOGO_URL = 'https://pht.group/wp-content/uploads/2026/05/PHT-Logo_4C.webp';

function normalizeLoginInput(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').trim();
}

export function LoginPage() {
  const { user, loading, login } = useAppAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/command-center';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-slate-400 text-sm">
        Anmeldung wird geprüft…
      </div>
    );
  }

  if (user) {
    if (user.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await login(normalizeLoginInput(username), normalizeLoginInput(password));
      if (result.ok) {
        navigate(result.user?.mustChangePassword ? '/change-password' : from, { replace: true });
      } else {
        setError(result.error ?? 'Anmeldung fehlgeschlagen');
      }
    } finally {
      setSubmitting(false);
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
          <p className="text-sm text-slate-400 mb-6">Bitte anmelden. Am Handy in Safari oder Chrome öffnen.</p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" autoComplete="on">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500">Benutzername oder E-Mail</span>
              <input
                name="username"
                type="text"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                enterKeyHint="next"
                placeholder="DominikWeller oder weller@pht.group"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full px-3 py-3 rounded-lg bg-dark-900 border border-dark-500 text-white text-base min-h-[48px] focus:border-pht-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500">Passwort</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-3 rounded-lg bg-dark-900 border border-dark-500 text-white text-base min-h-[48px] focus:border-pht-400 focus:outline-none"
              />
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dasselbe Passwort wie am Computer — nicht das Microsoft-/Outlook-Passwort.
              Nicht in WhatsApp oder Snapaddy öffnen, sondern den Link in Safari oder Chrome.
            </p>
            {error && (
              <p className="text-sm text-red-400" role="alert">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 min-h-[48px] rounded-lg bg-pht-accent text-white text-base font-medium hover:bg-pht-accent-hover disabled:opacity-50"
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
