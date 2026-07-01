import adminApiClient from './adminApiClient';

export interface EmployeeRoleDoc {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  storeId?: string | null;
  isActive: boolean;
  permissionCount: number;
  assignedUserCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionRegistry {
  permissions: Record<string, string>;
  groups: Record<string, string[]>;
}

type Envelope<T> = { success: boolean; message: string; data: T };

export const employeeRolesApi = {
  list(params?: { storeId?: string; includeInactive?: boolean }) {
    return adminApiClient.get<Envelope<EmployeeRoleDoc[]>>('/employee-roles', { params });
  },

  getPermissions() {
    return adminApiClient.get<Envelope<PermissionRegistry>>('/employee-roles/permissions');
  },

  create(body: { name: string; description?: string; permissions: string[]; storeId?: string }) {
    return adminApiClient.post<Envelope<EmployeeRoleDoc>>('/employee-roles', body);
  },

  update(id: string, body: { name?: string; description?: string; permissions?: string[]; isActive?: boolean }) {
    return adminApiClient.put<Envelope<EmployeeRoleDoc>>(`/employee-roles/${id}`, body);
  },

  deactivate(id: string) {
    return adminApiClient.delete<Envelope<EmployeeRoleDoc>>(`/employee-roles/${id}`);
  },

  assignToUser(userId: string, employeeRoleId: string | null) {
    return adminApiClient.put<Envelope<unknown>>(`/admin/users/${userId}/role`, { employeeRoleId });
  },
};
