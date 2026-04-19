/* eslint-disable @typescript-eslint/no-explicit-any */
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

interface RegisterPushTokenResponse {
  success?: boolean
  message?: string
}

interface ResetPushTokenResponse {
  success?: boolean
  message?: string
}

interface UnreadCountResponse {
  unread_count: number
}

const normalizeUnreadCount = (raw: any): number => {
  const candidates = [
    raw?.unread_count,
    raw?.unreadCount,
    raw?.count,
    raw?.total_unread,
    raw?.data?.unread_count,
    raw?.data?.unreadCount,
    raw?.data?.count,
    raw?.meta?.unread_count,
  ]

  for (const value of candidates) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }

  return 0
}

export const notificationApi = {
  getMyNotifications: async (params?: { page?: number; limit?: number; is_read?: boolean; type?: string; event_code?: string }) => {
    const response = await api.get<NotificationResponse>('/notifications/me', { params })
    return response.data
  },

  getUnreadCount: async () => {
    const response = await api.get<any>('/notifications/me/unread-count')
    const unread_count = normalizeUnreadCount(response.data)
    return { unread_count } as UnreadCountResponse
  },

  markAsRead: async (id: string) => {
    const response = await api.patch<{ success: boolean; notification: NotificationPayload }>(`/notifications/${id}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await api.patch<{ success: boolean; matched_count: number; modified_count: number }>('/notifications/me/read-all')
    return response.data
  },

  registerPushToken: async (token: string) => {
    const response = await api.patch<RegisterPushTokenResponse>('/auth/update-fcm-token', {
      token,
    })
    return response.data
  },

  resetPushToken: async (jwt?: string) => {
    const response = await api.post<ResetPushTokenResponse>(
      '/auth/reset-fcmToken',
      {},
      jwt
        ? {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
        : undefined,
    )
    return response.data
  },
}
