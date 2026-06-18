import api from './axios';
import type { ApiResponse, BrewLog, PaginatedResponse, User } from '../types';

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin';
  subscriptionStatus?: 'none' | 'active' | 'expired' | 'cancelled';
}

export const usersApi = {
  getUsers: (params?: GetUsersParams) =>
    api.get<PaginatedResponse<User>>('/admin/users', { params }),

  // GET /admin/users/:id — requires backend route
  getUserById: (id: string) =>
    api.get<ApiResponse<User>>(`/admin/users/${id}`),

  updateUser: (id: string, data: Partial<Pick<User, 'role' | 'subscriptionStatus' | 'isPremium'>>) =>
    api.put<ApiResponse<User>>(`/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete<ApiResponse<void>>(`/admin/users/${id}`),

  getUserBrewLogs: (userId: string, page = 1) =>
    api.get<PaginatedResponse<BrewLog>>('/brew-logs', { params: { userId, page } }),

  // GET /admin/users/export — returns CSV blob
  exportUsersCSV: () =>
    api.get('/admin/users/export', { responseType: 'blob' }),

  /** @deprecated use getUsers */
  getAll: (params?: GetUsersParams) =>
    api.get<PaginatedResponse<User>>('/admin/users', { params }),

  /** @deprecated use updateUser */
  update: (id: string, data: Partial<Pick<User, 'role' | 'subscriptionStatus' | 'isPremium'>>) =>
    api.put<ApiResponse<User>>(`/admin/users/${id}`, data),

  /** @deprecated use deleteUser */
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/admin/users/${id}`),
};
