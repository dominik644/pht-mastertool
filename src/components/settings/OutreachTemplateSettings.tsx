import { useMemo, useState } from 'react';
import { useAppAuth } from '../../context/AppAuthContext';
import {
  DEFAULT_TEMPLATE,
  getOutreachTemplateRaw,
  resolveOutreachUserKey,
  saveOutreachTemplate,
} from '../../services/userOutreachTemplate';
import { Card, CardContent, CardHeader } from '../ui/Card';

export function OutreachTemplateSettings() {
  const { user } = useAppAuth();
  const userKey = useMemo(
    () => resolveOutreachUserKey(user?.email, user?.username, user?.name),
    [user],
  );
  const [template, setTemplate] = useState(() => getOutreachTemplateRaw(userKey));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveOutreachTemplate(userKey, template);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setTemplate(DEFAULT_TEMPLATE);
    saveOutreachTemplate(userKey, DEFAULT_TEMPLATE);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white">Allgemeines Anschreiben</h2>
        <p className="text-xs text-slate-500 mt-1">
          Text für „Allgemeines Anschreiben" in der Tourenplanung (ohne Terminlinks).
          Platzhalter: <code className="text-slate-400">{'{{name}}'}</code> = Ihr Name.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={10}
          className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-500 text-sm text-white font-mono"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-dark-500 text-sm text-slate-400 hover:text-white"
          >
            Standard wiederherstellen
          </button>
          {saved && <span className="text-xs text-emerald-400 self-center">Gespeichert</span>}
        </div>
      </CardContent>
    </Card>
  );
}
