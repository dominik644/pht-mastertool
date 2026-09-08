import { CheckSquare } from 'lucide-react';
import { TodoMobile } from '../components/TodoMobile';
import { TodoBoard } from '../components/todo/TodoBoard';
import { useViewMode } from '../context/ViewModeContext';

export function TodoPage() {
  const { isMobileView } = useViewMode();
  if (isMobileView) return <TodoMobile />;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-7 h-7 text-pht-400" />
          To Do
        </h1>
      </header>
      <TodoBoard />
    </div>
  );
}
