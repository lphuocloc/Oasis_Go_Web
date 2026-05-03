import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import {
    type ProcessWithdrawalPayload,
    type WalletWithdrawalFilters,
    type WalletWithdrawalItem,
    type WalletWithdrawalListResult,
    walletWithdrawalApi,
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

export const withdrawalsApi = createApi({
    reducerPath: 'withdrawalsApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Withdrawals'],
    endpoints: (builder) => ({
        getWithdrawals: builder.query<WalletWithdrawalListResult, WalletWithdrawalFilters | void>({
            queryFn: async (filters) => {
                try {
                    const safeFilters = filters ?? {}
                    const response = await walletWithdrawalApi.processWithdrawal(safeFilters)
                    return { data: response as WalletWithdrawalListResult }
                } catch (error: unknown) {
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: getErrorMessage(error, 'Không thể tải danh sách yêu cầu rút tiền'),
                        },
                    }
                }
            },
            providesTags: ['Withdrawals'],
        }),
        processWithdrawal: builder.mutation<
            WalletWithdrawalItem | null,
            { id: string; payload: ProcessWithdrawalPayload }
        >({
            queryFn: async ({ id, payload }) => {
                try {
                    const response = await walletWithdrawalApi.processWithdrawal(id, payload)
                    return { data: response as WalletWithdrawalItem | null }
                } catch (error: unknown) {
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: getErrorMessage(error, 'Không thể xử lý yêu cầu rút tiền'),
                        },
                    }
                }
            },
            invalidatesTags: ['Withdrawals'],
        }),
    }),
})

export const { useGetWithdrawalsQuery, useProcessWithdrawalMutation } = withdrawalsApi
