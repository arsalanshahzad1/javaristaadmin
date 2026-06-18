import api from './axios';
import type { ApiResponse, EspressoShot, PaginatedResponse } from '../types';

export const espressoApi = {
  getAllShots: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<EspressoShot>>('/espresso', { params }),

  deleteShot: (id: string) =>
    api.delete<ApiResponse<void>>(`/espresso/${id}`),

  /** @deprecated use getAllShots */
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<EspressoShot>>('/espresso', { params }),
};
