import { createSlice } from '@reduxjs/toolkit'
import type { BookingItem, BookingPagination } from '../../api/lib/bookingApi'
import type { RootState } from '../index'
import { fetchBookings } from '../thunks/bookingsThunks'

interface BookingsState {
    items: BookingItem[]
    pagination: BookingPagination
    isLoading: boolean
    error: string | null
}

const initialState: BookingsState = {
    items: [],
    pagination: {
        current_page: 1,
        total_pages: 1,
        total_items: 0,
        items_per_page: 20,
    },
    isLoading: false,
    error: null,
}

const bookingsSlice = createSlice({
    name: 'bookings',
    initialState,
    reducers: {
        clearBookingsError: (state) => {
            state.error = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBookings.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchBookings.fulfilled, (state, action) => {
                state.isLoading = false
                state.items = action.payload.append
                    ? [...state.items, ...action.payload.bookings]
                    : action.payload.bookings
                state.pagination = {
                    ...state.pagination,
                    ...action.payload.pagination,
                }
            })
            .addCase(fetchBookings.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload ?? 'Failed to load bookings'
            })
    },
})

export const { clearBookingsError } = bookingsSlice.actions

export const selectBookingsState = (state: RootState) => state.bookings
export const selectBookings = (state: RootState) => state.bookings.items
export const selectBookingsPagination = (state: RootState) => state.bookings.pagination
export const selectBookingsLoading = (state: RootState) => state.bookings.isLoading
export const selectBookingsError = (state: RootState) => state.bookings.error

export default bookingsSlice.reducer
