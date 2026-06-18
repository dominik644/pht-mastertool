import { GitBranch, Plus } from 'lucide-react';
import { useState } from 'react';
import { PipelineBoard } from '../components/PipelineBoard';
import { createPipelineEntry } from '../services/salesPipelineStorage';
import { useViewMode } from '../context/ViewModeContext';

export function PipelinePage() {
  const { isMobileView } = useViewMode();
  const [refreshKey, setRefreshKey] = useState(0);

  const addManual = () => {
    const title = window.prompt('Deal-Titel:');
    if (!title?.trim()) return;
    const valueRaw = window.prompt('Geschätzter Wert (€):', '50000');
    createPipelineEntry({
      title: title.trim(),
      estimatedValue: Number(valueRaw) || 50_000,
      sourceType: 'manual',
      stage: 'Lead',
    });
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-[1600px] mx-auto`}>
      <header className={`${isMobileView ? 'mb-5' : 'mb-8'} flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4`}>
        <div>
          <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
            <GitBranch className="w-7 h-7 text-pht-400" />
            Vertriebs-Pipeline
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Lead → Qualifiziert → Angebot → Verhandlung → Gewonnen · Lokal gespeichert (kein externes CRM)
          </p>
        </div>
        <button
          type="button"
          onClick={addManual}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700"
        >
          <Plus className="w-4 h-4" />
          Manueller Deal
        </button>
      </header>
      <PipelineBoard key={refreshKey} />
    </div>
  );
}
