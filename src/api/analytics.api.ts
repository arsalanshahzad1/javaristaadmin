import api from './axios';
import type {
  ApiResponse,
  BrewActivityData,
  DashboardStats,
  PopularMethodData,
  RatingData,
  TopRecipeData,
  UserGrowthData,
} from '../types';

export const analyticsApi = {
  getDashboardStats: () =>
    api.get<ApiResponse<DashboardStats>>('/admin/stats'),

  // GET /admin/analytics/user-growth — requires backend route
  getUserGrowth: () =>
    api.get<ApiResponse<UserGrowthData[]>>('/admin/analytics/user-growth'),

  getBrewActivity: () =>
    api.get<ApiResponse<BrewActivityData[]>>('/admin/analytics/brew-activity'),

  getPopularMethods: () =>
    api.get<ApiResponse<PopularMethodData[]>>('/admin/analytics/popular-methods'),

  getTopRecipes: () =>
    api.get<ApiResponse<TopRecipeData[]>>('/admin/analytics/top-recipes'),

  getRatingDistribution: () =>
    api.get<ApiResponse<RatingData[]>>('/admin/analytics/ratings'),

  /** @deprecated use getDashboardStats */
  getStats: () =>
    api.get<ApiResponse<DashboardStats>>('/admin/stats'),
};
