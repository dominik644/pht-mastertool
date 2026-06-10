import { Mail, Save } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useMicrosoftAuth } from '../context/MicrosoftAuthContext';
import { isValidEmail } from '../services/integrationSettings';

export function IntegrationEmailBar() {
  const { targetEmail, setTargetEmail, user } = useMicrosoftAuth();
  const [draft, setDraft] = useState(targetEmail);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(targetEmail), [targetEmail]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(draft)) return;
    setTargetEmail(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={handleSave} className="flex items-center gap-1.5" title="Kalender & To Do werden an diese E-Mail gesendet">
      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0 hidden lg:block" />
      <input
        type="email"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="ziel@email.de"
        className="w-28 sm:w-40 lg:w-48 px-2 py-1.5 rounded-lg border border-dark-500 bg-dark-700 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-pht-500/50"
      />
      <button
        type="submit"
        disabled={!isValidEmail(draft) || draft === targetEmail}
        className="px-2 py-1.5 rounded-lg border border-dark-500 text-xs text-slate-400 hover:text-white hover:bg-dark-700 disabled:opacity-40"
      >
        <Save className="w-3.5 h-3.5" />
      </button>
      {saved && <span className="text-[10px] text-emerald-400 hidden sm:inline">Gespeichert</span>}
      {user && user.email !== targetEmail && (
        <span className="text-[10px] text-sky-400 hidden xl:inline truncate max-w-[120px]" title={`Angemeldet: ${user.email}`}>
          MS: {user.email.split('@')[0]}
        </span>
      )}
    </form>
  );
}
