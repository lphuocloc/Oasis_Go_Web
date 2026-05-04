import { createAsyncThunk } from '@reduxjs/toolkit'
import { bookingApi } from '../../api/lib/bookingApi'
import {
    cleaningTaskApi,
    type CleaningRequestSource,
    type CleaningTaskManagerBookingItem,
    type CleaningTaskStatus,
    type CleaningTaskWithMediaPayload
} from '../../api/lib/cleaningTaskApi'

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

import { type BookingListResult, type BookingListFilters } from '../../api/lib/bookingApi'

export const fetchManagerBookings = createAsyncThunk<
    BookingListResult,
    BookingListFilters | void,
    { rejectValue: string }
>('managerCleaningTasks/fetchManagerBookings', async (filters, { rejectWithValue }) => {
    try {
        const response = await bookingApi.getAll(filters || { page: 1, limit: 20 })
        return response
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch booking'))
    }
})

export const fetchManagerCleaningTasks = createAsyncThunk<
    CleaningTaskManagerBookingItem[],
    {
        booking_id: string
        status?: CleaningTaskStatus | 'all'
        request_source?: CleaningRequestSource | 'all'
        due_from?: string
        due_to?: string
    },
    { rejectValue: string }
>('managerCleaningTasks/fetchManagerCleaningTasks', async (params, { rejectWithValue }) => {
    try {
        const response = await cleaningTaskApi.getManagerCleanerBooking(params)
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch nhiá»‡m vá»¥ vá»‡ sinh'))
    }
})

export const fetchManagerCleaningTaskDetail = createAsyncThunk<
    CleaningTaskWithMediaPayload,
    string,
    { rejectValue: string }
>('managerCleaningTasks/fetchManagerCleaningTaskDetail', async (taskId, { rejectWithValue }) => {
    try {
        const response = await cleaningTaskApi.getWithMedia(taskId)
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'KhÃ´ng thá»ƒ táº£i chi tiáº¿t nhiá»‡m vá»¥'))
    }
})

