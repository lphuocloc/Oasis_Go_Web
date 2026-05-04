import { createSlice } from '@reduxjs/toolkit'
import { type BookingItem, type BookingPagination } from '../../api/lib/bookingApi'
import {
    type CleaningTaskManagerBookingItem,
    type CleaningTaskWithMediaPayload
} from '../../api/lib/cleaningTaskApi'
import {
    fetchManagerBookings,
    fetchManagerCleaningTaskDetail,
    fetchManagerCleaningTasks
} from '../thunks/managerCleaningTasksThunks'

interface ManagerCleaningTasksState {
    bookings: BookingItem[]
    bookingsPagination?: BookingPagination | null
    isBookingsLoading: boolean

    tasks: CleaningTaskManagerBookingItem[]
    isTasksLoading: boolean

    detailData: CleaningTaskWithMediaPayload | null
    detailLoading: boolean
}

const initialState: ManagerCleaningTasksState = {
    bookings: [],
    bookingsPagination: null,
    isBookingsLoading: false,

    tasks: [],
    isTasksLoading: false,

    detailData: null,
    detailLoading: false
}

const managerCleaningTasksSlice = createSlice({
    name: 'managerCleaningTasks',
    initialState,
    reducers: {
        clearManagerCleaningTaskDetail: (state) => {
            state.detailData = null
        },
        clearManagerCleaningTasks: (state) => {
            state.tasks = []
        }
    },
    extraReducers: (builder) => {
        // Fetch Bookings
        builder.addCase(fetchManagerBookings.pending, (state) => {
            state.isBookingsLoading = true
        })
        builder.addCase(fetchManagerBookings.fulfilled, (state, action) => {
            state.isBookingsLoading = false
            state.bookings = action.payload.bookings ?? action.payload.data ?? []
            state.bookingsPagination = action.payload.pagination ?? null
        })
        builder.addCase(fetchManagerBookings.rejected, (state) => {
            state.isBookingsLoading = false
        })

        // Fetch Tasks
        builder.addCase(fetchManagerCleaningTasks.pending, (state) => {
            state.isTasksLoading = true
        })
        builder.addCase(fetchManagerCleaningTasks.fulfilled, (state, action) => {
            state.isTasksLoading = false
            state.tasks = action.payload
        })
        builder.addCase(fetchManagerCleaningTasks.rejected, (state) => {
            state.isTasksLoading = false
            state.tasks = []
        })

        // Fetch Task Detail
        builder.addCase(fetchManagerCleaningTaskDetail.pending, (state) => {
            state.detailLoading = true
        })
        builder.addCase(fetchManagerCleaningTaskDetail.fulfilled, (state, action) => {
            state.detailLoading = false
            state.detailData = action.payload
        })
        builder.addCase(fetchManagerCleaningTaskDetail.rejected, (state) => {
            state.detailLoading = false
            state.detailData = null
        })
    }
})

export const { clearManagerCleaningTaskDetail, clearManagerCleaningTasks } = managerCleaningTasksSlice.actions
export default managerCleaningTasksSlice.reducer

