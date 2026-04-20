import { useCallback, useEffect } from 'react'
import type { NotificationPayload } from '../api/notificationApi'
import { initUserSocket, disconnectUserSocket } from '../lib/socket'
import { toast } from 'react-toastify'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  selectNotifications,
  selectNotificationsLoading,
  selectNotificationsPagination,
  selectNotificationsUnreadCount,
  upsertIncomingNotification,
} from '../store/slices/notificationsSlice'
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  refreshNotifications,
} from '../store/thunks/notificationsThunks'

type SocketNotificationEvent = {
  user_id?: string
  sent_at?: string
  notification?: Partial<NotificationPayload>
} & Partial<NotificationPayload>

export const useNotifications = () => {
  const dispatch = useAppDispatch()
  const notifications = useAppSelector(selectNotifications)
  const unreadCount = useAppSelector(selectNotificationsUnreadCount)
  const loading = useAppSelector(selectNotificationsLoading)
  const pagination = useAppSelector(selectNotificationsPagination)

  const normalizeSocketNotification = (payload: SocketNotificationEvent): NotificationPayload => {
    const source = payload.notification ?? payload
    const nowIso = new Date().toISOString()

    return {
      id: String(source.id ?? `${source.event_code ?? 'socket'}-${Date.now()}`),
      user_id: String(source.user_id ?? payload.user_id ?? ''),
      title: String(source.title ?? 'Thong bao moi'),
      message: String(source.message ?? ''),
      type: String(source.type ?? 'SYSTEM'),
      event_code: String(source.event_code ?? ''),
      is_read: Boolean(source.is_read ?? false),
      read_at: source.read_at ?? null,
      data: source.data ?? {},
      createdAt: String(source.createdAt ?? nowIso),
      updatedAt: String(source.updatedAt ?? nowIso),
    }
  }

  const fetchInitialData = useCallback(async () => {
    await dispatch(refreshNotifications())
  }, [dispatch])

  useEffect(() => {
    fetchInitialData()

    // Initialize Socket
    const socket = initUserSocket()

    const handleNewNotification = (data: SocketNotificationEvent) => {
      console.log('[Socket][user:notification] Raw payload from BE:', data)

      const source = normalizeSocketNotification(data)
      console.log('[Socket][user:notification] Normalized notification:', source)

      const toastTitle = source.title || 'Thong bao moi'
      const toastMessage = source.message || ''
      toast.info(toastMessage ? `${toastTitle}: ${toastMessage}` : toastTitle, {
        toastId: source.id,
      })

      // Render instantly from socket payload.
      dispatch(upsertIncomingNotification(source))

      // Always fetch latest notification list and unread count from API after socket emit.
      dispatch(refreshNotifications())

      // Some backends emit before data is fully persisted, so we refresh once more shortly after.
      setTimeout(() => {
        dispatch(refreshNotifications())
      }, 1200)
    }

    if (socket) {
      socket.on('user:notification', handleNewNotification)
    }

    return () => {
      if (socket) {
        socket.off('user:notification', handleNewNotification)
      }
      disconnectUserSocket()
    }
  }, [dispatch, fetchInitialData])

  const loadMore = useCallback(async () => {
    if (loading || pagination.page >= pagination.pages) return

    const nextPage = pagination.page + 1
    await dispatch(fetchNotifications({ page: nextPage, limit: pagination.limit, append: true }))
  }, [dispatch, loading, pagination.limit, pagination.page, pagination.pages])

  const markAsRead = useCallback(async (id: string) => {
    const target = notifications.find((item) => item.id === id)
    if (target && !target.is_read) {
      await dispatch(markNotificationAsRead(id))
    }
  }, [dispatch, notifications])

  const markAllAsRead = useCallback(async () => {
    await dispatch(markAllNotificationsAsRead())
  }, [dispatch])

  return {
    notifications,
    unreadCount,
    loading,
    pagination,
    loadMore,
    markAsRead,
    markAllAsRead,
    refresh: fetchInitialData
  }
}
