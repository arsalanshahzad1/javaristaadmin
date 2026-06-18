import api from './axios';
import type { ApiResponse, BrewLog, PaginatedResponse } from '../types';

interface GetBrewLogsParams {
  page?: number;
  limit?: number;
  brewMethod?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const brewLogsApi = {
  getAllBrewLogs: (params?: GetBrewLogsParams) =>
    api.get<PaginatedResponse<BrewLog>>('/admin/brew-logs', { params }),

  deleteBrewLog: (id: string) =>
    api.delete<ApiResponse<void>>(`/brew-logs/${id}`),

  /** @deprecated use getAllBrewLogs */
  getAll: (params?: GetBrewLogsParams) =>
    api.get<PaginatedResponse<BrewLog>>('/admin/brew-logs', { params }),
};
