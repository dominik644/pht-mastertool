import { TenderDetail } from '../components/TenderDetail';
import { TenderDetailMobile } from '../components/TenderDetailMobile';
import { useViewMode } from '../context/ViewModeContext';

export function TenderDetailPage() {
  const { isMobileView } = useViewMode();
  if (isMobileView) return <TenderDetailMobile />;
  return <TenderDetail />;
}
