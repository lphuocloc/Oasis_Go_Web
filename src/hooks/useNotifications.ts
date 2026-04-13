import { useEffect, useState, useCallback } from 'react'
import { notificationApi, type NotificationPayload } from '../api/notificationApi'
import { initUserSocket, disconnectUserSocket } from '../lib/socket'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true)
      const countRes = await notificationApi.getUnreadCount()
      setUnreadCount(countRes.unread_count || 0)

      const notiRes = await notificationApi.getMyNotifications({ page: 1, limit: 10 })
      setNotifications(notiRes.data)
      setPagination(notiRes.pagination)
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitialData()

    // Initialize Socket
    const socket = initUserSocket()

    const handleNewNotification = (data: any) => {
      // data: { user_id, sent_at, ...notification }
      const newNoti = data as NotificationPayload
      
      setNotifications(prev => [newNoti, ...prev])
      setUnreadCount(prev => prev + 1)
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
  }, [fetchInitialData])

  const loadMore = async () => {
    if (loading || pagination.page >= pagination.pages) return
    
    try {
      setLoading(true)
      const nextPage = pagination.page + 1
      const notiRes = await notificationApi.getMyNotifications({ page: nextPage, limit: 10 })
      setNotifications(prev => [...prev, ...notiRes.data])
      setPagination(notiRes.pagination)
    } catch (err) {
      console.error('Failed to load more notifications', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const target = notifications.find(n => n.id === id)
      if (target && !target.is_read) {
        await notificationApi.markAsRead(id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to mark as read', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read', err)
    }
  }

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
