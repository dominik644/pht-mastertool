import { Navigate, Outlet } from 'react-router-dom';
import { useAppAuth } from '../context/AppAuthContext';

export function RequirePasswordChange() {
  const { user, loading } = useAppAuth();

  if (loading) return null;

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
