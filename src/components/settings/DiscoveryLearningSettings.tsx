import { Brain, Download } from 'lucide-react';
import { useMemo } from 'react';
import {
  exportDiscoveryProfileJson,
  loadDiscoveryProfile,
} from '../../services/discoveryLearning';
import { Card, CardContent, CardHeader } from '../ui/Card';

export function DiscoveryLearningSettings() {
  const profile = useMemo(() => loadDiscoveryProfile(), []);

  const handleExport = () => {
    const json = exportDiscoveryProfileJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'discovery-learning.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const boost = profile.boostSectorIds?.length ?? 0;
  const exclude = profile.excludeSectorIds?.length ?? 0;
  const notes = profile.notes?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          Neukunden-Lernprofil
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Entsteht aus Daumen-Feedback mit Begründung in der Tourenplanung.
          Beeinflusst Sortierung neuer Leads und die tägliche Discovery (JSON-Export).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-400">
          {boost > 0 || exclude > 0 || notes > 0
            ? `${boost} bevorzugte Branchen · ${exclude} ausgeschlossen · ${notes} Notizen`
            : 'Noch kein Feedback – Daumen + Begründung bei NEU-Leads vergeben.'}
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-500 text-sm text-slate-300 hover:text-white hover:border-pht-500/40"
        >
          <Download className="w-4 h-4" />
          discovery-learning.json exportieren
        </button>
        <p className="text-[10px] text-slate-600">
          Datei nach <code className="text-slate-500">public/data/discovery-learning.json</code> legen
          für automatische Neukunden-Suche (Cron).
        </p>
      </CardContent>
    </Card>
  );
}
