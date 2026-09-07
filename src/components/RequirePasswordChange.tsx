import { Navigate, Outlet } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';

export function RequirePasswordChange() {
  const { user, loading } = useAppAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-slate-400 text-sm">
        Anmeldung wird geprüft…
      </div>
    );
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
