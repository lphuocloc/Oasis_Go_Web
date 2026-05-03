import { createSlice } from '@reduxjs/toolkit'
import type { VoucherItem, VoucherPagination } from '../../api/lib/voucherApi'
import type { RootState } from '../index'
import {
    activateVoucher,
    createVoucher,
    deactivateVoucher,
    fetchVoucherDetail,
    fetchVouchers,
    updateVoucher,
} from '../thunks/vouchersThunks'

interface VouchersState {
    items: VoucherItem[]
    pagination: VoucherPagination
    isLoading: boolean
    error: string | null
    detail: VoucherItem | null
    detailLoading: boolean
    isSaving: boolean
}

const initialState: VouchersState = {
    items: [],
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        current_page: 1,
        total_pages: 1,
        total_items: 0,
        items_per_page: 20,
    },
    isLoading: false,
    error: null,
    detail: null,
    detailLoading: false,
    isSaving: false,
}

const vouchersSlice = createSlice({
    name: 'vouchers',
    initialState,
    reducers: {
        clearVouchersError: (state) => {
            state.error = null
        },
        clearVoucherDetail: (state) => {
            state.detail = null
            state.detailLoading = false
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchVouchers.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchVouchers.fulfilled, (state, action) => {
                state.isLoading = false
                state.items = action.payload.append
                    ? [...state.items, ...action.payload.items]
                    : action.payload.items
                state.pagination = {
                    ...state.pagination,
                    ...action.payload.pagination,
                }
            })
            .addCase(fetchVouchers.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload ?? 'Failed to load vouchers'
            })
            .addCase(fetchVoucherDetail.pending, (state) => {
                state.detailLoading = true
                state.error = null
            })
            .addCase(fetchVoucherDetail.fulfilled, (state, action) => {
                state.detailLoading = false
                state.detail = action.payload
            })
            .addCase(fetchVoucherDetail.rejected, (state, action) => {
                state.detailLoading = false
                state.error = action.payload ?? 'Failed to load voucher detail'
            })
            .addCase(createVoucher.pending, (state) => {
                state.isSaving = true
                state.error = null
            })
            .addCase(createVoucher.fulfilled, (state, action) => {
                state.isSaving = false
                state.items = [action.payload, ...state.items]
            })
            .addCase(createVoucher.rejected, (state, action) => {
                state.isSaving = false
                state.error = action.payload ?? 'Failed to create voucher'
            })
            .addCase(updateVoucher.pending, (state) => {
                state.isSaving = true
                state.error = null
            })
            .addCase(updateVoucher.fulfilled, (state, action) => {
                state.isSaving = false
                const index = state.items.findIndex((item) => item.id === action.payload.id)
                if (index !== -1) {
                    state.items[index] = action.payload
                }
                if (state.detail?.id === action.payload.id) {
                    state.detail = action.payload
                }
            })
            .addCase(updateVoucher.rejected, (state, action) => {
                state.isSaving = false
                state.error = action.payload ?? 'Failed to update voucher'
            })
            .addCase(activateVoucher.fulfilled, (state, action) => {
                const index = state.items.findIndex((item) => item.id === action.payload.id)
                if (index !== -1) {
                    state.items[index] = action.payload
                }
                if (state.detail?.id === action.payload.id) {
                    state.detail = action.payload
                }
            })
            .addCase(deactivateVoucher.fulfilled, (state, action) => {
                const index = state.items.findIndex((item) => item.id === action.payload.id)
                if (index !== -1) {
                    state.items[index] = action.payload
                }
                if (state.detail?.id === action.payload.id) {
                    state.detail = action.payload
                }
            })
    },
})

export const { clearVouchersError, clearVoucherDetail } = vouchersSlice.actions

export const selectVouchersState = (state: RootState) => state.vouchers
export const selectVouchers = (state: RootState) => state.vouchers.items
export const selectVouchersPagination = (state: RootState) => state.vouchers.pagination
export const selectVouchersLoading = (state: RootState) => state.vouchers.isLoading
export const selectVouchersError = (state: RootState) => state.vouchers.error
export const selectVoucherDetail = (state: RootState) => state.vouchers.detail
export const selectVoucherDetailLoading = (state: RootState) => state.vouchers.detailLoading
export const selectVouchersSaving = (state: RootState) => state.vouchers.isSaving

export default vouchersSlice.reducer
