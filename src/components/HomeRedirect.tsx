import { Navigate } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';
import { defaultHomePath } from '../lib/userAccess';

export function HomeRedirect() {
  const { user, loading, configured } = useAppAuth();
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-400 text-sm">
        Lade…
      </div>
    );
  }
  const target = !configured || user ? defaultHomePath(user) : '/login';
  return <Navigate to={target} replace />;
}
