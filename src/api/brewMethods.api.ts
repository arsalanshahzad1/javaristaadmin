import api from './axios';
import type { ApiResponse, BrewMethod } from '../types';

interface BrewMethodPayload {
  name: string;
  icon?: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  ratio?: string;
  brewTimeMins?: number;
  brewTimeSecs?: number;
  grindSize?: string;
  equipment?: string[];
  isActive?: boolean;
}

export const brewMethodsApi = {
  getBrewMethods: () =>
    api.get<ApiResponse<BrewMethod[]>>('/brew-methods'),

  getBrewMethodById: (id: string) =>
    api.get<ApiResponse<BrewMethod>>(`/brew-methods/${id}`),

  createBrewMethod: (data: BrewMethodPayload) =>
    api.post<ApiResponse<BrewMethod>>('/brew-methods', data),

  updateBrewMethod: (id: string, data: Partial<BrewMethodPayload>) =>
    api.put<ApiResponse<BrewMethod>>(`/brew-methods/${id}`, data),

  deleteBrewMethod: (id: string) =>
    api.delete<ApiResponse<void>>(`/brew-methods/${id}`),

  /** @deprecated use getBrewMethods */
  getAll: () =>
    api.get<ApiResponse<BrewMethod[]>>('/brew-methods'),

  /** @deprecated use createBrewMethod */
  create: (data: BrewMethodPayload) =>
    api.post<ApiResponse<BrewMethod>>('/brew-methods', data),

  /** @deprecated use updateBrewMethod */
  update: (id: string, data: Partial<BrewMethodPayload>) =>
    api.put<ApiResponse<BrewMethod>>(`/brew-methods/${id}`, data),

  /** @deprecated use deleteBrewMethod */
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/brew-methods/${id}`),
};
