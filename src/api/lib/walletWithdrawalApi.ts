import { api } from '../api'

export const WITHDRAWAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number]

export interface WalletWithdrawalItem {
    id: string
    user_id: string
    wallet_id: string
    amount: number
    status: WithdrawalStatus
    bank_name_snapshot: string
    bank_account_number_snapshot: string
    bank_account_holder_snapshot?: string
    note?: string
    requester_name: string
    requested_at: string
    processed_at: string | null
    processed_by: string | null
    updated_at: string
}

export interface WalletWithdrawalFilters {
    status?: WithdrawalStatus
    page?: number
    limit?: number
}

export interface WalletWithdrawalPagination {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    current_page?: number
    total_pages?: number
    total_items?: number
    items_per_page?: number
}

interface WalletWithdrawalListResponse {
    success: boolean
    message?: string
    data:
    | WalletWithdrawalItem[]
    | {
        items?: WalletWithdrawalItem[]
        withdrawals?: WalletWithdrawalItem[]
        pagination?: WalletWithdrawalPagination
    }
    pagination?: WalletWithdrawalPagination
}

export interface WalletWithdrawalListResult {
    items: WalletWithdrawalItem[]
    pagination?: WalletWithdrawalPagination
}

export type ProcessWithdrawalAction = 'APPROVE' | 'REJECT'

export interface ProcessWithdrawalPayload {
    action: ProcessWithdrawalAction
    note: string
}

type ProcessWithdrawalApi = {
    (filters?: WalletWithdrawalFilters): Promise<WalletWithdrawalListResult>
    (id: string, payload: ProcessWithdrawalPayload): Promise<WalletWithdrawalItem | null>
}

interface ProcessWithdrawalResponse {
    success: boolean
    message?: string
    data?:
    | WalletWithdrawalItem
    | {
        withdrawal?: WalletWithdrawalItem
        item?: WalletWithdrawalItem
    }
}

const buildParams = (filters?: WalletWithdrawalFilters, includeStatus = true): URLSearchParams => {
    const params = new URLSearchParams()

    if (!filters) return params
    if (includeStatus && filters.status) params.append('status', filters.status)
    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))

    return params
}

const normalizeList = (payload: WalletWithdrawalListResponse): WalletWithdrawalListResult => {
    const normalizePagination = (pagination?: WalletWithdrawalPagination): WalletWithdrawalPagination | undefined => {
        if (!pagination) return undefined

        return {
            page: pagination.page ?? pagination.current_page,
            limit: pagination.limit ?? pagination.items_per_page,
            total: pagination.total ?? pagination.total_items,
            totalPages: pagination.totalPages ?? pagination.total_pages,
            current_page: pagination.current_page ?? pagination.page,
            total_pages: pagination.total_pages ?? pagination.totalPages,
            total_items: pagination.total_items ?? pagination.total,
            items_per_page: pagination.items_per_page ?? pagination.limit,
        }
    }

    if (Array.isArray(payload.data)) {
        return {
            items: payload.data,
            pagination: normalizePagination(payload.pagination),
        }
    }

    const items = payload.data.items ?? payload.data.withdrawals ?? []
    return {
        items,
        pagination: normalizePagination(payload.data.pagination ?? payload.pagination),
    }
}

export const walletWithdrawalApi = {
    processWithdrawal: (async (
        idOrFilters?: string | WalletWithdrawalFilters,
        payload?: ProcessWithdrawalPayload,
    ): Promise<WalletWithdrawalListResult | WalletWithdrawalItem | null> => {
        if (typeof idOrFilters !== 'string') {
            const params = buildParams(idOrFilters, false)
            const response = await api.get<WalletWithdrawalListResponse>('/wallets/withdrawals/pending', { params })
            return normalizeList(response.data)
        }

        const response = await api.post<ProcessWithdrawalResponse>(
            `/wallets/withdrawals/${idOrFilters}/process`,
            payload,
        )

        if (!response.data.data) {
            return null
        }

        if ('id' in response.data.data) {
            return response.data.data
        }

        return response.data.data.withdrawal ?? response.data.data.item ?? null
    }) as ProcessWithdrawalApi,
}
