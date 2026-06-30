import adminApiClient from './adminApiClient';
import type { PaginatedResponse } from '../types';
import type { SubtreeNode, RoleChangeRequest } from '../types/org';

export const orgApi = {
  /**
   * Fetch the org chart tree. Pass rootUserId to zoom into a subtree.
   * Returns an array of root-level SubtreeNodes.
   */
  getOrgChart: async (rootUserId?: string): Promise<SubtreeNode[]> => {
    const res = await adminApiClient.get<{ data: SubtreeNode[] }>('/org/chart', {
      params: rootUserId ? { rootUserId } : undefined,
    });
    return res.data.data;
  },

  /**
   * Assign or remove a manager for a user.
   * Pass managerId=null to remove the current manager.
   */
  setUserManager: async (userId: string, managerId: string | null): Promise<void> => {
    await adminApiClient.put(`/org/users/${userId}/manager`, { managerId });
  },

  /**
   * List role change requests with optional filters and pagination.
   */
  getRoleChangeRequests: async (params: {
    storeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<RoleChangeRequest>> => {
    const res = await adminApiClient.get<PaginatedResponse<RoleChangeRequest>>(
      '/org/role-change-requests',
      { params }
    );
    return res.data;
  },

  /**
   * Approve or reject a role change request.
   */
  reviewRoleChangeRequest: async (
    requestId: string,
    decision: 'approved' | 'rejected',
    reviewNote?: string
  ): Promise<RoleChangeRequest> => {
    const res = await adminApiClient.patch<{ data: RoleChangeRequest }>(
      `/org/role-change-requests/${requestId}/review`,
      { decision, reviewNote }
    );
    return res.data.data;
  },
};
