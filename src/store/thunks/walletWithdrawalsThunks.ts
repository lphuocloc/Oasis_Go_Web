import { createAsyncThunk } from '@reduxjs/toolkit'
import {
    type ProcessWithdrawalAction,
    walletWithdrawalApi,
    type WalletWithdrawalFilters,
    type WalletWithdrawalListResult,
} from '../../api/lib/walletWithdrawalApi'

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

export interface FetchWalletWithdrawalsArgs extends WalletWithdrawalFilters {
    append?: boolean
}

export interface FetchWalletWithdrawalsResult extends WalletWithdrawalListResult {
    append: boolean
}

export interface ProcessWalletWithdrawalArgs {
    id: string
    action: ProcessWithdrawalAction
    note?: string
}

export interface ProcessWalletWithdrawalResult {
    id: string
    status: 'APPROVED' | 'REJECTED'
    processed_at: string
    processed_by: string
}

export const fetchWalletWithdrawals = createAsyncThunk<
    FetchWalletWithdrawalsResult,
    FetchWalletWithdrawalsArgs | void,
    { rejectValue: string }
>('walletWithdrawals/fetchWalletWithdrawals', async (args, { rejectWithValue }) => {
    try {
        const append = args?.append ?? false
        const page = args?.page ?? 1
        const limit = args?.limit ?? 20

        const response = await walletWithdrawalApi.processWithdrawal({
            page,
            limit,
        })

        return {
            ...response,
            append,
        }
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to load withdrawals'))
    }
})

export const processWalletWithdrawal = createAsyncThunk<
    ProcessWalletWithdrawalResult,
    ProcessWalletWithdrawalArgs,
    { rejectValue: string }
>('walletWithdrawals/processWalletWithdrawal', async (args, { rejectWithValue }) => {
    try {
        if (args.action === 'REJECT' && !args.note?.trim()) {
            return rejectWithValue('Vui long nhap ghi chu khi tu choi yeu cau.')
        }

        const processed = await walletWithdrawalApi.processWithdrawal(args.id, {
            action: args.action,
            note: args.note?.trim() ?? '',
        })

        const status: 'APPROVED' | 'REJECTED' = args.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

        return {
            id: args.id,
            status,
            processed_at: processed?.processed_at ?? new Date().toISOString(),
            processed_by: processed?.processed_by ?? 'Admin User',
        }
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to process withdrawal'))
    }
})
