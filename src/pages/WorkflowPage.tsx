import { WorkflowBoard } from '../components/WorkflowBoard';
import { WorkflowHistory } from '../components/WorkflowHistory';
import { WorkflowMobile } from '../components/WorkflowMobile';
import { useViewMode } from '../context/ViewModeContext';

export function WorkflowPage() {
  const { isMobileView } = useViewMode();
  if (isMobileView) return <WorkflowMobile />;

  return (
    <div>
      <WorkflowBoard />
      <div className="px-8 pb-8 max-w-3xl">
        <WorkflowHistory />
      </div>
    </div>
  );
}
