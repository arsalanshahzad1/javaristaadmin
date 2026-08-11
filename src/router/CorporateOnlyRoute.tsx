import { Navigate, Outlet } from 'react-router-dom';
import { adminAuthStorage } from '../api/adminAuthStorage';

export function CorporateOnlyRoute() {
  if (!adminAuthStorage.isCorporate()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
