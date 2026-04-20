import { createSlice } from '@reduxjs/toolkit'
import type {
    WalletWithdrawalItem,
    WalletWithdrawalPagination,
} from '../../api/lib/walletWithdrawalApi'
import type { RootState } from '../index'
import {
    fetchWalletWithdrawals,
    processWalletWithdrawal,
} from '../thunks/walletWithdrawalsThunks'

interface WalletWithdrawalsState {
    items: WalletWithdrawalItem[]
    pagination: WalletWithdrawalPagination
    isLoading: boolean
    error: string | null
}

const initialState: WalletWithdrawalsState = {
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
}

const walletWithdrawalsSlice = createSlice({
    name: 'walletWithdrawals',
    initialState,
    reducers: {
        clearWalletWithdrawalsError: (state) => {
            state.error = null
        },
        updateWithdrawalStatusLocal: (state, action) => {
            const { id, status, processed_at, processed_by } = action.payload as {
                id: string
                status: WalletWithdrawalItem['status']
                processed_at: string
                processed_by: string
            }

            state.items = state.items.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        status,
                        processed_at,
                        processed_by,
                    }
                    : item,
            )
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWalletWithdrawals.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchWalletWithdrawals.fulfilled, (state, action) => {
                state.isLoading = false
                state.items = action.payload.append
                    ? [...state.items, ...action.payload.items]
                    : action.payload.items
                state.pagination = {
                    ...state.pagination,
                    ...action.payload.pagination,
                }
            })
            .addCase(fetchWalletWithdrawals.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload ?? 'Failed to load withdrawals'
            })
            .addCase(processWalletWithdrawal.pending, (state) => {
                state.error = null
            })
            .addCase(processWalletWithdrawal.fulfilled, (state, action) => {
                const index = state.items.findIndex((item) => item.id === action.payload.id)
                if (index === -1) return

                state.items[index] = {
                    ...state.items[index],
                    status: action.payload.status,
                    processed_at: action.payload.processed_at,
                    processed_by: action.payload.processed_by,
                }
            })
            .addCase(processWalletWithdrawal.rejected, (state, action) => {
                state.error = action.payload ?? 'Failed to process withdrawal'
            })
    },
})

export const {
    clearWalletWithdrawalsError,
    updateWithdrawalStatusLocal,
} = walletWithdrawalsSlice.actions

export const selectWalletWithdrawalsState = (state: RootState) => state.walletWithdrawals
export const selectWalletWithdrawals = (state: RootState) => state.walletWithdrawals.items
export const selectWalletWithdrawalsPagination = (state: RootState) => state.walletWithdrawals.pagination
export const selectWalletWithdrawalsLoading = (state: RootState) => state.walletWithdrawals.isLoading
export const selectWalletWithdrawalsError = (state: RootState) => state.walletWithdrawals.error

export default walletWithdrawalsSlice.reducer
