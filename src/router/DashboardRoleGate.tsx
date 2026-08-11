import { Navigate } from 'react-router-dom';
import { adminAuthStorage } from '../api/adminAuthStorage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

// store_manager has no org-wide dashboard to look at — send them straight to their store.
export function DashboardRoleGate() {
  if (!adminAuthStorage.isCorporate()) {
    return <Navigate to="/my-store" replace />;
  }
  return <DashboardPage />;
}
