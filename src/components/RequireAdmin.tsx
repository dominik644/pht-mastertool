import { Navigate, Outlet } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';

export function RequireAdmin() {
  const { user, loading, configured } = useAppAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-400 text-sm">
        Berechtigung wird geprüft…
      </div>
    );
  }

  if (!configured || user?.admin) {
    return <Outlet />;
  }

  return <Navigate to="/command-center" replace />;
}
