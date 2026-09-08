import { Mic } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PlaudInboxPanel } from '../components/plaud/PlaudInboxPanel';
import { PlaudSettings } from '../components/settings/PlaudSettings';
import { useViewMode } from '../context/ViewModeContext';

export function PlaudPage() {
  const { isMobileView } = useViewMode();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('note');

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-3xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-4' : 'mb-6'}`}>
        <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
          <Mic className={`${isMobileView ? 'w-6 h-6' : 'w-7 h-7'} text-pht-400`} />
          Plaud Note
        </h1>
        <p className="text-slate-400 mt-1 text-xs sm:text-sm">
          Gesprächsnotizen vom Plaud-Gerät — Transkript, Summary und Action Items im Mastertool.
        </p>
      </header>

      <PlaudInboxPanel focusId={focusId} />

      <div className="mt-6">
        <PlaudSettings />
      </div>
    </div>
  );
}
