import { api } from './api'

export interface NotificationPayload {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  event_code: string
  is_read: boolean
  read_at: string | null
  data: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface NotificationResponse {
  data: NotificationPayload[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const notificationApi = {
  getMyNotifications: async (params?: { page?: number; limit?: number; is_read?: boolean; type?: string; event_code?: string }) => {
    const response = await api.get<NotificationResponse>('/notifications/me', { params })
    return response.data
  },

  getUnreadCount: async () => {
    const response = await api.get<{ unread_count: number }>('/notifications/me/unread-count')
    return response.data
  },

  markAsRead: async (id: string) => {
    const response = await api.patch<{ success: boolean; notification: NotificationPayload }>(`/notifications/${id}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await api.patch<{ success: boolean; matched_count: number; modified_count: number }>('/notifications/me/read-all')
    return response.data
  }
}
