import { WorkflowBoard } from '../components/WorkflowBoard';
import { WorkflowHistory } from '../components/WorkflowHistory';

export function WorkflowPage() {
  return (
    <div>
      <WorkflowBoard />
      <div className="px-8 pb-8 max-w-3xl">
        <WorkflowHistory />
      </div>
    </div>
  );
}
