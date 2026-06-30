import adminApiClient from './adminApiClient';

export type ManualItemType =
  | 'document'
  | 'video'
  | 'checklist'
  | 'assessment'
  | 'certification'
  | 'reading';

export interface RoleManualItem {
  _id: string;
  type: ManualItemType;
  title: string;
  description?: string;
  contentUrl?: string;
  contentText?: string;
  isRequired: boolean;
  order: number;
  estimatedMinutes?: number;
}

export interface RoleManualSection {
  _id: string;
  title: string;
  order: number;
  items: RoleManualItem[];
}

export interface RoleManual {
  _id: string;
  targetRole: string;
  title: string;
  description?: string;
  version: string;
  isActive: boolean;
  sections: RoleManualSection[];
  createdBy?: { _id?: string; name?: string };
  createdAt: string;
  updatedAt: string;
}

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

export const roleManualsApi = {
  getAll: () =>
    adminApiClient.get<ApiEnvelope<RoleManual[]>>('/role-manuals'),

  getById: (id: string) =>
    adminApiClient.get<ApiEnvelope<RoleManual>>(`/role-manuals/${id}`),

  create: (data: {
    targetRole: string;
    title: string;
    description?: string;
    version?: string;
    isActive?: boolean;
  }) => adminApiClient.post<ApiEnvelope<RoleManual>>('/role-manuals', data),

  update: (
    id: string,
    data: Partial<{
      targetRole: string;
      title: string;
      description: string;
      version: string;
      isActive: boolean;
    }>
  ) => adminApiClient.put<ApiEnvelope<RoleManual>>(`/role-manuals/${id}`, data),

  remove: (id: string) =>
    adminApiClient.delete<ApiEnvelope<void>>(`/role-manuals/${id}`),

  addSection: (id: string, data: { title: string; order?: number }) =>
    adminApiClient.post<ApiEnvelope<RoleManual>>(`/role-manuals/${id}/sections`, data),

  updateSection: (
    id: string,
    sectionId: string,
    data: { title?: string; order?: number }
  ) =>
    adminApiClient.put<ApiEnvelope<RoleManual>>(
      `/role-manuals/${id}/sections/${sectionId}`,
      data
    ),

  deleteSection: (id: string, sectionId: string) =>
    adminApiClient.delete<ApiEnvelope<RoleManual>>(
      `/role-manuals/${id}/sections/${sectionId}`
    ),

  addItem: (
    id: string,
    sectionId: string,
    data: {
      type: ManualItemType;
      title: string;
      description?: string;
      contentUrl?: string;
      contentText?: string;
      isRequired?: boolean;
      order?: number;
      estimatedMinutes?: number;
    }
  ) =>
    adminApiClient.post<ApiEnvelope<RoleManual>>(
      `/role-manuals/${id}/sections/${sectionId}/items`,
      data
    ),

  updateItem: (
    id: string,
    sectionId: string,
    itemId: string,
    data: Partial<{
      type: ManualItemType;
      title: string;
      description: string;
      contentUrl: string;
      contentText: string;
      isRequired: boolean;
      order: number;
      estimatedMinutes: number;
    }>
  ) =>
    adminApiClient.put<ApiEnvelope<RoleManual>>(
      `/role-manuals/${id}/sections/${sectionId}/items/${itemId}`,
      data
    ),

  deleteItem: (id: string, sectionId: string, itemId: string) =>
    adminApiClient.delete<ApiEnvelope<RoleManual>>(
      `/role-manuals/${id}/sections/${sectionId}/items/${itemId}`
    ),
};
