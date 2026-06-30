import adminApiClient from './adminApiClient';

export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AdminNotification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  relatedId?: string;
  relatedType?: string;
  storeId?: string;
  checklistId?: string;
  submissionId?: string;
  recipientRole?: string;
  severity?: NotificationSeverity;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AdminNotification[];
  unreadCount: number;
  total: number;
}

export const notificationsApi = {
  getNotifications: async (params?: {
    unreadOnly?: boolean;
    limit?: number;
    page?: number;
  }): Promise<NotificationsResponse> => {
    const response = await adminApiClient.get<{ data: NotificationsResponse }>(
      '/notifications',
      { params }
    );
    return response.data.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await adminApiClient.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await adminApiClient.put('/notifications/read-all');
  },

  deleteNotification: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/notifications/${id}`);
  },
};
