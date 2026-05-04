import { createAsyncThunk } from '@reduxjs/toolkit'
import { adminUserApi, type AdminUserDetail, type AdminUserListItem } from '../../api/lib/adminUserApi'

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

export const fetchAdminUsers = createAsyncThunk<
    AdminUserListItem[],
    void,
    { rejectValue: string }
>('adminUsers/fetchAdminUsers', async (_, { rejectWithValue }) => {
    try {
        const response = await adminUserApi.getAll()
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the tai danh sach nguoi dung'))
    }
})

export const fetchAdminUserDetail = createAsyncThunk<
    AdminUserDetail,
    string,
    { rejectValue: string }
>('adminUsers/fetchAdminUserDetail', async (id, { rejectWithValue }) => {
    try {
        const response = await adminUserApi.getById(id)
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the tai chi tiet nguoi dung'))
    }
})
