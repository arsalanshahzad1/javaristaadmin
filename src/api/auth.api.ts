import api from './axios';
import type { ApiResponse, User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
      '/auth/login',
      { email, password },
    ),

  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  updateProfile: (data: Pick<User, 'name'>) =>
    api.put<ApiResponse<User>>('/auth/profile', data),

  logout: () =>
    api.post('/auth/logout'),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.put<ApiResponse<void>>('/users/change-password', { oldPassword, newPassword }),
};
