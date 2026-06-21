import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLoginPage } from '../components/auth/AdminLoginPage';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminProtectedRoute } from './AdminProtectedRoute';

// New pages
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { AcademyPage } from '../pages/academy/AcademyPage';
import { CourseFormPage } from '../pages/academy/CourseFormPage';
import { JavaAcademyPage } from '../pages/java-academy/JavaAcademyPage';
import { PlaybooksPage } from '../pages/playbooks/PlaybooksPage';
import { PlaybookFormPage } from '../pages/playbooks/PlaybookFormPage';
import { StoreOpsPage } from '../pages/store-ops/StoreOpsPage';
import { StoreRecipeFormPage } from '../pages/store-ops/StoreRecipeFormPage';
import { ExclusiveContentPage } from '../pages/exclusive-content/ExclusiveContentPage';
import { InvestorContentPage } from '../pages/investor/InvestorContentPage';
import { InvestorContentFormPage } from '../pages/investor/InvestorContentFormPage';
import { ChecklistsPage } from '../pages/checklists/ChecklistsPage';
import { CertificationsPage } from '../pages/certifications/CertificationsPage';
import { TeamPerformancePage } from '../pages/team-performance/TeamPerformancePage';
import { BrewSharesPage } from '../pages/brew-shares/BrewSharesPage';
import { CommunityPage } from '../pages/community/CommunityPage';

// Existing pages
import { UsersPage } from '../pages/users/UsersPage';
import { UserDetailPage } from '../pages/users/UserDetailPage';
import { UserPerformancePage } from '../pages/users/UserPerformancePage';
import { RecipesPage } from '../pages/recipes/RecipesPage';
import { RecipeFormPage } from '../pages/recipes/RecipeFormPage';
import { BrewMethodsPage } from '../pages/brewMethods/BrewMethodsPage';
import { BrewMethodFormPage } from '../pages/brewMethods/BrewMethodFormPage';
import { BrewLogsPage } from '../pages/brewLogs/BrewLogsPage';
import { EspressoPage } from '../pages/espresso/EspressoPage';
import { SubscriptionsPage } from '../pages/subscriptions/SubscriptionsPage';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { SettingsPage } from '../pages/settings/SettingsPage';

export const adminRouter = createBrowserRouter([
  { path: '/login', element: <AdminLoginPage /> },
  {
    element: <AdminProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          // Primary dashboard route
          { path: '/dashboard', element: <DashboardPage /> },

          // Content
          { path: '/academy', element: <AcademyPage /> },
          { path: '/academy/courses/new', element: <CourseFormPage /> },
          { path: '/academy/courses/:id/edit', element: <CourseFormPage /> },
          { path: '/java-academy', element: <JavaAcademyPage /> },
          { path: '/playbooks', element: <PlaybooksPage /> },
          { path: '/playbooks/new', element: <PlaybookFormPage /> },
          { path: '/playbooks/:slug/edit', element: <PlaybookFormPage /> },
          { path: '/store-ops', element: <StoreOpsPage /> },
          { path: '/store-ops/recipes/new', element: <StoreRecipeFormPage /> },
          { path: '/store-ops/recipes/:slug/edit', element: <StoreRecipeFormPage /> },
          { path: '/store-recipes', element: <Navigate to="/store-ops" replace /> },
          { path: '/exclusive-content', element: <ExclusiveContentPage /> },
          { path: '/investor-content', element: <InvestorContentPage /> },
          { path: '/investor-content/new', element: <InvestorContentFormPage /> },
          { path: '/investor-content/:slug/edit', element: <InvestorContentFormPage /> },

          // Operations
          { path: '/checklists', element: <ChecklistsPage /> },
          { path: '/certifications', element: <CertificationsPage /> },

          // People
          { path: '/users', element: <UsersPage /> },
          { path: '/users/:id', element: <UserDetailPage /> },
          { path: '/performance', element: <TeamPerformancePage /> },
          { path: '/performance/user/:id', element: <UserPerformancePage /> },
          { path: '/team-performance', element: <TeamPerformancePage /> },

          // Community
          { path: '/brew-shares', element: <BrewSharesPage /> },
          { path: '/community', element: <CommunityPage /> },

          // Existing routes (legacy paths)
          { path: '/recipes', element: <RecipesPage /> },
          { path: '/recipes/new', element: <RecipeFormPage /> },
          { path: '/recipes/:id/edit', element: <RecipeFormPage /> },
          { path: '/brew-methods', element: <BrewMethodsPage /> },
          { path: '/brew-methods/new', element: <BrewMethodFormPage /> },
          { path: '/brew-methods/:id/edit', element: <BrewMethodFormPage /> },
          { path: '/brew-logs', element: <BrewLogsPage /> },
          { path: '/espresso', element: <EspressoPage /> },
          { path: '/subscriptions', element: <SubscriptionsPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
