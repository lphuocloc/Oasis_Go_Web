import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import {
    type LedgerFilters,
    type LedgerListResult,
    type LedgerSummary,
    type LedgerSummaryFilters,
    ledgerApi,
} from '../../api/lib/ledgerApi'

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

export const ledgerApiSlice = createApi({
    reducerPath: 'ledgerApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Ledger'],
    endpoints: (builder) => ({
        getLedgerList: builder.query<LedgerListResult, LedgerFilters | void>({
            queryFn: async (filters) => {
                try {
                    const response = await ledgerApi.list(filters ?? {})
                    return { data: response }
                } catch (error: unknown) {
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: getErrorMessage(error, 'Không thể tải danh sách ledger'),
                        },
                    }
                }
            },
            providesTags: ['Ledger'],
        }),
        getLedgerSummary: builder.query<LedgerSummary, LedgerSummaryFilters | void>({
            queryFn: async (filters) => {
                try {
                    const response = await ledgerApi.summary(filters ?? {})
                    return { data: response }
                } catch (error: unknown) {
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: getErrorMessage(error, 'Không thể tải tổng quan ledger'),
                        },
                    }
                }
            },
            providesTags: ['Ledger'],
        }),
    }),
})

export const { useGetLedgerListQuery, useGetLedgerSummaryQuery } = ledgerApiSlice
