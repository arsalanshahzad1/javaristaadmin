import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { UsersPage } from '../pages/users/UsersPage';
import { UserDetailPage } from '../pages/users/UserDetailPage';
import { RecipesPage } from '../pages/recipes/RecipesPage';
import { RecipeFormPage } from '../pages/recipes/RecipeFormPage';
import { BrewMethodsPage } from '../pages/brewMethods/BrewMethodsPage';
import { BrewMethodFormPage } from '../pages/brewMethods/BrewMethodFormPage';
import { BrewLogsPage } from '../pages/brewLogs/BrewLogsPage';
import { EspressoPage } from '../pages/espresso/EspressoPage';
import { SubscriptionsPage } from '../pages/subscriptions/SubscriptionsPage';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { EmployeeRolesPage } from '../pages/employee-roles/EmployeeRolesPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/users/:id', element: <UserDetailPage /> },
          { path: '/employee-roles', element: <EmployeeRolesPage /> },
          { path: '/recipes', element: <RecipesPage /> },
          { path: '/recipes/new', element: <RecipeFormPage /> },
          { path: '/recipes/:id/edit', element: <RecipeFormPage /> },
          { path: '/brew-methods', element: <BrewMethodsPage /> },
          { path: '/brew-methods/new', element: <BrewMethodFormPage /> },
          { path: '/brew-methods/:id/edit', element: <BrewMethodFormPage /> },
          { path: '/brew-logs', element: <BrewLogsPage /> },
          { path: '/espresso', element: <EspressoPage /> },
          { path: '/subscriptions', element: <SubscriptionsPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
