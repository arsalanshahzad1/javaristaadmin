import api from './axios';
import type { ApiResponse, PaginatedResponse, Subscription, User } from '../types';

interface GetSubscriptionsParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'expired' | 'cancelled';
  platform?: string;
}

export const subscriptionsApi = {
  // GET /admin/subscriptions — requires backend route
  getSubscriptions: (params?: GetSubscriptionsParams) =>
    api.get<PaginatedResponse<Subscription>>('/admin/subscriptions', { params }),

  grantPremium: (userId: string) =>
    api.put<ApiResponse<User>>(`/admin/users/${userId}`, { isPremium: true }),

  revokePremium: (userId: string) =>
    api.put<ApiResponse<User>>(`/admin/users/${userId}`, { isPremium: false }),

  /** @deprecated use getSubscriptions */
  getAll: (params?: GetSubscriptionsParams) =>
    api.get<PaginatedResponse<Subscription>>('/admin/subscriptions', { params }),
};
