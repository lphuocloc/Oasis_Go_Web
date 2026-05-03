import { api } from '../api'

export const LEDGER_TYPES = [
    'ESCROW_CREDIT',
    'ESCROW_DEBIT',
    'REVENUE_RECOGNIZED',
    'PAYOUT',
] as const

export type LedgerType = (typeof LEDGER_TYPES)[number]

export const LEDGER_SOURCES = [
    'booking',
    'refund',
    'withdrawal',
    'adjustment',
    'penalty',
] as const

export type LedgerSource = (typeof LEDGER_SOURCES)[number]

export interface LedgerEntry {
    id: string
    _id?: string
    type: LedgerType
    amount: number
    escrow_delta: number
    currency: string
    source: string
    dedupe_key?: string | null
    user_id?: string | null
    user_name?: string | null
    user_email?: string | null
    wallet_id?: string | null
    order_id?: string | null
    transaction_id?: string | null
    wallet_transaction_id?: string | null
    withdrawal_request_id?: string | null
    reference_id?: string | null
    description?: string | null
    created_at: string
    updated_at: string
}

export interface LedgerPagination {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
}

export interface LedgerFilters {
    page?: number
    limit?: number
    startDate?: string
    endDate?: string
    type?: LedgerType
    source?: LedgerSource | string
    order_id?: string
    user_id?: string
    wallet_id?: string
    transaction_id?: string
    reference_id?: string
}

interface LedgerListResponse {
    success: boolean
    data: LedgerEntry[]
    pagination?: LedgerPagination
}

export interface LedgerListResult {
    items: LedgerEntry[]
    pagination?: LedgerPagination
}

export interface LedgerSummaryFilters {
    startDate?: string
    endDate?: string
}

export interface LedgerSummary {
    escrow_balance: number
    escrow_in: number
    escrow_out: number
    revenue_recognized: number
    payout: number
    transaction_count: number
}

interface LedgerSummaryResponse {
    success: boolean
    data: LedgerSummary
}

const buildParams = (filters?: LedgerFilters): URLSearchParams => {
    const params = new URLSearchParams()

    if (!filters) return params

    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.type) params.append('type', filters.type)
    if (filters.source) params.append('source', String(filters.source))
    if (filters.order_id) params.append('order_id', filters.order_id)
    if (filters.user_id) params.append('user_id', filters.user_id)
    if (filters.wallet_id) params.append('wallet_id', filters.wallet_id)
    if (filters.transaction_id) params.append('transaction_id', filters.transaction_id)
    if (filters.reference_id) params.append('reference_id', filters.reference_id)

    return params
}

const buildSummaryParams = (filters?: LedgerSummaryFilters): URLSearchParams => {
    const params = new URLSearchParams()

    if (!filters) return params

    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)

    return params
}

export const ledgerApi = {
    list: async (filters?: LedgerFilters): Promise<LedgerListResult> => {
        const params = buildParams(filters)
        const response = await api.get<LedgerListResponse>('/admin/ledger', { params })

        return {
            items: response.data.data,
            pagination: response.data.pagination,
        }
    },
    summary: async (filters?: LedgerSummaryFilters): Promise<LedgerSummary> => {
        const params = buildSummaryParams(filters)
        const response = await api.get<LedgerSummaryResponse>('/admin/ledger/summary', { params })
        return response.data.data
    },
}
