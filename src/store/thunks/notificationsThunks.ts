import { createAsyncThunk } from '@reduxjs/toolkit'
import { notificationApi, type NotificationResponse } from '../../api/notificationApi'
import type { RootState } from '../index'

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response
        const message = response?.data?.message

        if (typeof message === 'string' && message.trim()) {
            return message
        }
    }

    return fallback
}

interface FetchNotificationsArgs {
    page?: number
    limit?: number
    append?: boolean
}

interface FetchNotificationsResult extends NotificationResponse {
    append: boolean
}

export const fetchNotifications = createAsyncThunk<
    FetchNotificationsResult,
    FetchNotificationsArgs | void,
    { rejectValue: string }
>('notifications/fetchNotifications', async (args, { rejectWithValue }) => {
    try {
        const page = args?.page ?? 1
        const limit = args?.limit ?? 10
        const append = args?.append ?? false

        const response = await notificationApi.getMyNotifications({ page, limit })
        return {
            ...response,
            append,
        }
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to load notifications'))
    }
})

export const fetchUnreadCount = createAsyncThunk<
    number,
    void,
    { rejectValue: string }
>('notifications/fetchUnreadCount', async (_, { rejectWithValue }) => {
    try {
        const response = await notificationApi.getUnreadCount()
        return response.unread_count || 0
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to load unread count'))
    }
})

export const markNotificationAsRead = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>('notifications/markAsRead', async (id, { rejectWithValue }) => {
    try {
        await notificationApi.markAsRead(id)
        return id
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to mark notification as read'))
    }
})

export const markAllNotificationsAsRead = createAsyncThunk<
    void,
    void,
    { rejectValue: string }
>('notifications/markAllAsRead', async (_, { rejectWithValue }) => {
    try {
        await notificationApi.markAllAsRead()
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to mark all notifications as read'))
    }
})

export const refreshNotifications = createAsyncThunk<
    void,
    void,
    { state: RootState; rejectValue: string }
>('notifications/refresh', async (_, { dispatch, getState, rejectWithValue }) => {
    try {
        const limit = getState().notifications.pagination.limit || 10

        await Promise.all([
            dispatch(fetchUnreadCount()).unwrap(),
            dispatch(fetchNotifications({ page: 1, limit, append: false })).unwrap(),
        ])
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to refresh notifications'))
    }
})
