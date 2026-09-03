import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';

export function RequireAuth() {
  const { user, loading, configured } = useAppAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-slate-400 text-sm">
        Anmeldung wird geprüft…
      </div>
    );
  }

  if (!configured || user) {
    return <Outlet />;
  }

  return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}
