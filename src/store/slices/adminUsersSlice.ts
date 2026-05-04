import { createSlice } from '@reduxjs/toolkit'
import type { AdminUserDetail, AdminUserListItem } from '../../api/lib/adminUserApi'
import type { RootState } from '../index'
import { fetchAdminUserDetail, fetchAdminUsers } from '../thunks/adminUsersThunks'

interface AdminUsersState {
    items: AdminUserListItem[]
    isLoading: boolean
    error: string | null
    detail: AdminUserDetail | null
    detailLoading: boolean
}

const initialState: AdminUsersState = {
    items: [],
    isLoading: false,
    error: null,
    detail: null,
    detailLoading: false
}

const adminUsersSlice = createSlice({
    name: 'adminUsers',
    initialState,
    reducers: {
        clearAdminUsersError: (state) => {
            state.error = null
        },
        clearAdminUserDetail: (state) => {
            state.detail = null
            state.detailLoading = false
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAdminUsers.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchAdminUsers.fulfilled, (state, action) => {
                state.isLoading = false
                state.items = action.payload
            })
            .addCase(fetchAdminUsers.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload ?? 'Failed to load users'
            })
            .addCase(fetchAdminUserDetail.pending, (state) => {
                state.detailLoading = true
                state.error = null
            })
            .addCase(fetchAdminUserDetail.fulfilled, (state, action) => {
                state.detailLoading = false
                state.detail = action.payload
            })
            .addCase(fetchAdminUserDetail.rejected, (state, action) => {
                state.detailLoading = false
                state.error = action.payload ?? 'Failed to load user detail'
            })
    }
})

export const { clearAdminUsersError, clearAdminUserDetail } = adminUsersSlice.actions

export const selectAdminUsersState = (state: RootState) => state.adminUsers
export const selectAdminUsers = (state: RootState) => state.adminUsers.items
export const selectAdminUsersLoading = (state: RootState) => state.adminUsers.isLoading
export const selectAdminUsersError = (state: RootState) => state.adminUsers.error
export const selectAdminUserDetail = (state: RootState) => state.adminUsers.detail
export const selectAdminUserDetailLoading = (state: RootState) => state.adminUsers.detailLoading

export default adminUsersSlice.reducer
