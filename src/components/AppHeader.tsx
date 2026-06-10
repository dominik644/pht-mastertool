import { LogIn, LogOut, Monitor, RefreshCw, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useMicrosoftAuth } from '../context/MicrosoftAuthContext';
import { useTenders } from '../context/TenderContext';
import { useViewMode } from '../context/ViewModeContext';

export function AppHeader() {
  const { refreshTenders, loading, dataSource, isDemo } = useTenders();
  const { viewMode, setViewMode } = useViewMode();
  const { user, configured, defaultUser, signIn, signOut } = useMicrosoftAuth();
  const [msMsg, setMsMsg] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-3 border-b border-dark-500/50 bg-dark-900/95 backdrop-blur">
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">
          {dataSource ?? 'lädt…'}
          {isDemo && <span className="ml-2 text-amber-400">· Demo / Fallback aktiv</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex rounded-lg border border-dark-500 overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              viewMode === 'desktop' ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              viewMode === 'mobile' ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile
          </button>
        </div>
        {user ? (
          <button
            type="button"
            onClick={() => signOut()}
            title={user.email}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dark-500 text-xs text-slate-300 hover:bg-dark-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            {user.email.split('@')[0]}
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => setMsMsg(await signIn())}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sky-500/40 text-xs text-sky-300 hover:bg-sky-500/10"
            title={configured ? `Microsoft anmelden (${defaultUser})` : `Outlook/To Do – ${defaultUser}`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Microsoft
          </button>
        )}
        <button
          type="button"
          onClick={() => refreshTenders()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Neue Suche starten</span>
        </button>
      </div>
      {msMsg && <p className="absolute top-full right-6 mt-1 text-xs text-slate-500 max-w-xs truncate">{msMsg}</p>}
    </header>
  );
}
