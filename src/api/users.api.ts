import api from './axios';
import type { ApiResponse, BrewLog, PaginatedResponse } from '../types';

export type AdminRole = 'user' | 'admin';

export type AdminUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: AdminRole;
  isPremium: boolean;
  isVerified: boolean;
  subscriptionStatus: 'none' | 'active' | 'expired' | 'cancelled';
  createdAt: string;
  investorAccessLevel?: string;
  employeeRoleId?: string | null;
};

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin';
  subscriptionStatus?: 'none' | 'active' | 'expired' | 'cancelled';
}

export const usersApi = {
  getUsers: (params?: GetUsersParams) =>
    api.get<PaginatedResponse<AdminUser>>('/admin/users', { params }),

  // GET /admin/users/:id — requires backend route
  getUserById: (id: string) =>
    api.get<ApiResponse<AdminUser>>(`/admin/users/${id}`),

  updateUser: (id: string, data: Partial<Pick<AdminUser, 'role' | 'isPremium'>> & { subscriptionStatus?: 'none' | 'active' | 'expired' | 'cancelled' }) =>
    api.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete<ApiResponse<void>>(`/admin/users/${id}`),

  getUserBrewLogs: (userId: string, page = 1) =>
    api.get<PaginatedResponse<BrewLog>>('/brew-logs', { params: { userId, page } }),

  // GET /admin/users/export — returns CSV blob
  exportUsersCSV: () =>
    api.get('/admin/users/export', { responseType: 'blob' }),

  /** @deprecated use getUsers */
  getAll: (params?: GetUsersParams) =>
    api.get<PaginatedResponse<AdminUser>>('/admin/users', { params }),

  /** @deprecated use updateUser */
  update: (id: string, data: Partial<Pick<AdminUser, 'role' | 'isPremium'>> & { subscriptionStatus?: 'none' | 'active' | 'expired' | 'cancelled' }) =>
    api.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, data),

  /** @deprecated use deleteUser */
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/admin/users/${id}`),
};
