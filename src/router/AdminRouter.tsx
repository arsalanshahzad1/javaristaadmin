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
import { PlaybookDetailPage } from '../pages/playbooks/PlaybookDetailPage';
import { StoreOpsPage } from '../pages/store-ops/StoreOpsPage';
import { StoreRecipeFormPage } from '../pages/store-ops/StoreRecipeFormPage';
import { StoreRecipeDetailPage } from '../pages/store-ops/StoreRecipeDetailPage';
import { ExclusiveContentPage } from '../pages/exclusive-content/ExclusiveContentPage';
import { InvestorContentPage } from '../pages/investor/InvestorContentPage';
import { InvestorContentFormPage } from '../pages/investor/InvestorContentFormPage';
import { ConstructionJournalFormPage } from '../pages/investor/ConstructionJournalFormPage';
import { SourcingStoryFormPage } from '../pages/investor/SourcingStoryFormPage';
import { ChecklistsPage } from '../pages/checklists/ChecklistsPage';
import { CertificationsPage } from '../pages/certifications/CertificationsPage';
import { CertificationDetailPage } from '../pages/certifications/CertificationDetailPage';
import { CertificateVerifyPage } from '../pages/verify/CertificateVerifyPage';
import { TeamPerformancePage } from '../pages/team-performance/TeamPerformancePage';
import { EmployeeProfilePage } from '../pages/team-performance/EmployeeProfilePage';
import { BrewSharesPage } from '../pages/brew-shares/BrewSharesPage';
import { CommunityPage } from '../pages/community/CommunityPage';
import { StoresPage } from '../pages/stores/StoresPage';
import { StoreDetailPage } from '../pages/stores/StoreDetailPage';
import { OrgChartPage } from '../pages/org/OrgChartPage';
import { RoleChangeRequestsPage } from '../pages/org/RoleChangeRequestsPage';
import { RegionDashboardPage } from '../pages/region/RegionDashboardPage';

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
import { RoleManualsPage } from '../pages/role-manuals/RoleManualsPage';
import { RoleManualDetailPage } from '../pages/role-manuals/RoleManualDetailPage';

export const adminRouter = createBrowserRouter([
  { path: '/login', element: <AdminLoginPage /> },
  // Public verification routes — no auth required
  { path: '/verify/:certificateNumber', element: <CertificateVerifyPage /> },
  { path: '/verify', element: <CertificateVerifyPage /> },
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
          { path: '/playbooks/:slug/detail', element: <PlaybookDetailPage /> },
          { path: '/store-ops', element: <StoreOpsPage /> },
          { path: '/store-ops/recipes/new', element: <StoreRecipeFormPage /> },
          { path: '/store-ops/recipes/:slug/edit', element: <StoreRecipeFormPage /> },
          { path: '/store-ops/recipes/:slug/detail', element: <StoreRecipeDetailPage /> },
          { path: '/store-recipes', element: <Navigate to="/store-ops" replace /> },
          { path: '/exclusive-content', element: <ExclusiveContentPage /> },
          { path: '/investor-content', element: <InvestorContentPage /> },
          { path: '/investor-content/new', element: <InvestorContentFormPage /> },
          { path: '/investor-content/:slug/edit', element: <InvestorContentFormPage /> },
          { path: '/investor-content/journals/new', element: <ConstructionJournalFormPage /> },
          { path: '/investor-content/journals/:id/edit', element: <ConstructionJournalFormPage /> },
          { path: '/investor-content/stories/new', element: <SourcingStoryFormPage /> },
          { path: '/investor-content/stories/:id/edit', element: <SourcingStoryFormPage /> },

          { path: '/role-manuals', element: <RoleManualsPage /> },
          { path: '/role-manuals/:id', element: <RoleManualDetailPage /> },

          // Operations
          { path: '/stores', element: <StoresPage /> },
          { path: '/stores/:id', element: <StoreDetailPage /> },
          { path: '/checklists', element: <ChecklistsPage /> },
          { path: '/certifications', element: <CertificationsPage /> },
          { path: '/certifications/:id/detail', element: <CertificationDetailPage /> },

          // People
          { path: '/users', element: <UsersPage /> },
          { path: '/users/:id', element: <UserDetailPage /> },
          { path: '/performance', element: <TeamPerformancePage /> },
          { path: '/performance/user/:id', element: <UserPerformancePage /> },
          { path: '/team-performance', element: <TeamPerformancePage /> },
          { path: '/team-performance/employee/:userId', element: <EmployeeProfilePage /> },

          // Organisation
          { path: '/org/chart', element: <OrgChartPage /> },
          { path: '/org/role-changes', element: <RoleChangeRequestsPage /> },

          // Region
          { path: '/region/dashboard', element: <RegionDashboardPage /> },

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
