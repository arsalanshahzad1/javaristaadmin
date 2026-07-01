import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const ADMIN_ROLES = ['owner','ceo','coo','cfo','regional_manager','area_manager','hr_manager','marketing_manager'];
  if (user && !ADMIN_ROLES.includes(user.role)) return <Navigate to="/login" replace />;

  return <Outlet />;
}
