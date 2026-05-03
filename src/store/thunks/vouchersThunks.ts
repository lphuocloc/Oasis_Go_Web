/* eslint-disable @typescript-eslint/no-unused-vars */
import { createAsyncThunk } from '@reduxjs/toolkit'
import {
    type VoucherCreatePayload,
    type VoucherFilters,
    type VoucherItem,
    type VoucherListResult,
    type VoucherUpdatePayload,
    voucherApi,
} from '../../api/lib/voucherApi'

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

export interface FetchVouchersArgs extends VoucherFilters {
    append?: boolean
}

export interface FetchVouchersResult extends VoucherListResult {
    append: boolean
}

export const fetchVouchers = createAsyncThunk<
    FetchVouchersResult,
    FetchVouchersArgs | void,
    { rejectValue: string }
>('vouchers/fetchVouchers', async (args, { rejectWithValue }) => {
    try {
        const append = args?.append ?? false
        const { append: _append, ...filters } = args ?? {}
        const response = await voucherApi.list(filters)

        return {
            ...response,
            append,
        }
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the tai danh sach voucher'))
    }
})

export const fetchVoucherDetail = createAsyncThunk<
    VoucherItem,
    string,
    { rejectValue: string }
>('vouchers/fetchVoucherDetail', async (id, { rejectWithValue }) => {
    try {
        return await voucherApi.getById(id)
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the tai chi tiet voucher'))
    }
})

export const createVoucher = createAsyncThunk<
    VoucherItem,
    VoucherCreatePayload,
    { rejectValue: string }
>('vouchers/createVoucher', async (payload, { rejectWithValue }) => {
    try {
        return await voucherApi.create(payload)
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the tao voucher'))
    }
})

export const updateVoucher = createAsyncThunk<
    VoucherItem,
    { id: string; payload: VoucherUpdatePayload },
    { rejectValue: string }
>('vouchers/updateVoucher', async ({ id, payload }, { rejectWithValue }) => {
    try {
        return await voucherApi.update(id, payload)
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the cap nhat voucher'))
    }
})

export const activateVoucher = createAsyncThunk<
    VoucherItem,
    string,
    { rejectValue: string }
>('vouchers/activateVoucher', async (id, { rejectWithValue }) => {
    try {
        return await voucherApi.activate(id)
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the kich hoat voucher'))
    }
})

export const deactivateVoucher = createAsyncThunk<
    VoucherItem,
    string,
    { rejectValue: string }
>('vouchers/deactivateVoucher', async (id, { rejectWithValue }) => {
    try {
        return await voucherApi.deactivate(id)
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the vo hieu hoa voucher'))
    }
})
