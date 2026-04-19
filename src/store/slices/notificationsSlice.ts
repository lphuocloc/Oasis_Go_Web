import { createSlice } from '@reduxjs/toolkit'
import type { NotificationPayload, NotificationResponse } from '../../api/notificationApi'
import type { RootState } from '../index'
import {
    fetchNotifications,
    fetchUnreadCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    refreshNotifications,
} from '../thunks/notificationsThunks'

interface NotificationsState {
    items: NotificationPayload[]
    unreadCount: number
    pagination: NotificationResponse['pagination']
    isLoading: boolean
    error: string | null
}

const initialState: NotificationsState = {
    items: [],
    unreadCount: 0,
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
    },
    isLoading: false,
    error: null,
}

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        clearNotificationsError: (state) => {
            state.error = null
        },
        upsertIncomingNotification: (state, action) => {
            const incoming = action.payload as NotificationPayload
            const existingIndex = state.items.findIndex((item) => item.id === incoming.id)

            if (existingIndex === -1) {
                state.items = [incoming, ...state.items]
                if (!incoming.is_read) {
                    state.unreadCount += 1
                }
            } else {
                const previous = state.items[existingIndex]
                state.items[existingIndex] = incoming

                if (previous.is_read && !incoming.is_read) {
                    state.unreadCount += 1
                }

                if (!previous.is_read && incoming.is_read) {
                    state.unreadCount = Math.max(0, state.unreadCount - 1)
                }
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.isLoading = false
                state.items = action.payload.append
                    ? [...state.items, ...action.payload.data]
                    : action.payload.data
                state.pagination = action.payload.pagination

                if (!action.payload.append) {
                    const unreadFromLoadedItems = state.items.filter((item) => !item.is_read).length
                    if (state.unreadCount === 0 && unreadFromLoadedItems > 0) {
                        state.unreadCount = unreadFromLoadedItems
                    }
                }
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload ?? 'Failed to load notifications'
            })
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload
            })
            .addCase(fetchUnreadCount.rejected, (state, action) => {
                state.error = action.payload ?? 'Failed to load unread count'
            })
            .addCase(markNotificationAsRead.pending, (state) => {
                state.error = null
            })
            .addCase(markNotificationAsRead.fulfilled, (state, action) => {
                const index = state.items.findIndex((item) => item.id === action.payload)
                if (index !== -1 && !state.items[index].is_read) {
                    state.items[index].is_read = true
                    state.unreadCount = Math.max(0, state.unreadCount - 1)
                }
            })
            .addCase(markNotificationAsRead.rejected, (state, action) => {
                state.error = action.payload ?? 'Failed to mark notification as read'
            })
            .addCase(markAllNotificationsAsRead.pending, (state) => {
                state.error = null
            })
            .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
                state.items = state.items.map((item) => ({ ...item, is_read: true }))
                state.unreadCount = 0
            })
            .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
                state.error = action.payload ?? 'Failed to mark all notifications as read'
            })
            .addCase(refreshNotifications.rejected, (state, action) => {
                state.error = action.payload ?? 'Failed to refresh notifications'
            })
    },
})

export const { clearNotificationsError, upsertIncomingNotification } = notificationsSlice.actions

export const selectNotificationsState = (state: RootState) => state.notifications
export const selectNotifications = (state: RootState) => state.notifications.items
export const selectNotificationsUnreadCount = (state: RootState) => state.notifications.unreadCount
export const selectNotificationsPagination = (state: RootState) => state.notifications.pagination
export const selectNotificationsLoading = (state: RootState) => state.notifications.isLoading
export const selectNotificationsError = (state: RootState) => state.notifications.error

export default notificationsSlice.reducer
