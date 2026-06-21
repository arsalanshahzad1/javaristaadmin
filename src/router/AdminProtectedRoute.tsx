import { Navigate, Outlet } from 'react-router-dom';
import { adminAuthStorage } from '../api/adminAuthStorage';

export function AdminProtectedRoute() {
  if (!adminAuthStorage.isAdmin()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
