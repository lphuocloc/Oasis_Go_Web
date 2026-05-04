import { createAsyncThunk } from '@reduxjs/toolkit'
import { bookingApi } from '../../api/lib/bookingApi'
import { type BookingListFilters, type BookingListResult } from '../../api/lib/bookingApi'

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

export interface FetchBookingsArgs extends BookingListFilters {
    append?: boolean
}

export interface FetchBookingsResult extends BookingListResult {
    append: boolean
}

export const fetchBookings = createAsyncThunk<
    FetchBookingsResult,
    FetchBookingsArgs | void,
    { rejectValue: string }
>('bookings/fetchBookings', async (args, { rejectWithValue }) => {
    try {
        const append = args?.append ?? false
        const { append: _append, ...filters } = args ?? {}
        const response = await bookingApi.getAll(filters)

        return {
            ...response,
            append,
        }
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the tai danh sach booking'))
    }
})
