import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const SEEN_KEY = 'pht-mastertool-onboarding-seen';

export function OnboardingHint() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(SEEN_KEY) !== '1',
  );

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-40 max-w-xs rounded-xl border border-pht-500/40 bg-dark-800 shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-pht-400 shrink-0" />
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded text-slate-500 hover:text-white"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm font-medium text-white">Willkommen im Mastertool</p>
      <p className="text-xs text-slate-400 mt-1">
        Starte im{' '}
        <Link to="/command" onClick={dismiss} className="text-pht-400 hover:text-pht-300">
          Command Center
        </Link>
        {' '}für Prioritäten oder durchsuche Ausschreibungen unter Suche.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 w-full py-2 rounded-lg bg-pht-600/80 text-white text-xs font-medium hover:bg-pht-600"
      >
        Verstanden
      </button>
    </div>
  );
}
