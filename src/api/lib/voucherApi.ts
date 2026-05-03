import { api } from '../api'

export const VOUCHER_DISCOUNT_TYPES = ['PERCENT', 'FIXED'] as const
export type VoucherDiscountType = (typeof VOUCHER_DISCOUNT_TYPES)[number]

export interface VoucherItem {
    id: string
    code: string
    description?: string | null
    discount_type: VoucherDiscountType
    discount_value: number
    max_discount?: number | null
    min_booking_value?: number | null
    usage_limit?: number | null
    usage_count: number
    is_active: boolean
    valid_from: string
    valid_to: string
    created_at: string
    updated_at: string
}

export interface VoucherPagination {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    current_page?: number
    total_pages?: number
    total_items?: number
    items_per_page?: number
}

export interface VoucherFilters {
    page?: number
    limit?: number
    code?: string
    discount_type?: VoucherDiscountType
    is_active?: boolean
}

interface VoucherListResponse {
    success: boolean
    data:
    | VoucherItem[]
    | {
        items?: VoucherItem[]
        vouchers?: VoucherItem[]
        pagination?: VoucherPagination
    }
    pagination?: VoucherPagination
}

interface VoucherSingleResponse {
    success: boolean
    message?: string
    data: VoucherItem
}

export interface VoucherListResult {
    items: VoucherItem[]
    pagination?: VoucherPagination
}

export interface VoucherCreatePayload {
    code?: string
    description?: string | null
    discount_type: VoucherDiscountType
    discount_value: number
    max_discount?: number | null
    min_booking_value?: number | null
    usage_limit?: number | null
    is_active?: boolean
    valid_from: string
    valid_to: string
}

export interface VoucherUpdatePayload {
    code?: string
    description?: string | null
    discount_type?: VoucherDiscountType
    discount_value?: number
    max_discount?: number | null
    min_booking_value?: number | null
    usage_limit?: number | null
    is_active?: boolean
    valid_from?: string
    valid_to?: string
}

const buildParams = (filters?: VoucherFilters): URLSearchParams => {
    const params = new URLSearchParams()

    if (!filters) return params

    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))
    if (filters.code?.trim()) params.append('code', filters.code.trim())
    if (filters.discount_type) params.append('discount_type', filters.discount_type)
    if (typeof filters.is_active === 'boolean') params.append('is_active', String(filters.is_active))

    return params
}

const normalizePagination = (pagination?: VoucherPagination): VoucherPagination | undefined => {
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

const normalizeList = (payload: VoucherListResponse): VoucherListResult => {
    if (Array.isArray(payload.data)) {
        return {
            items: payload.data,
            pagination: normalizePagination(payload.pagination),
        }
    }

    const items = payload.data.items ?? payload.data.vouchers ?? []

    return {
        items,
        pagination: normalizePagination(payload.data.pagination ?? payload.pagination),
    }
}

export const voucherApi = {
    list: async (filters?: VoucherFilters): Promise<VoucherListResult> => {
        const params = buildParams(filters)
        const response = await api.get<VoucherListResponse>('/vouchers', { params })
        return normalizeList(response.data)
    },

    getById: async (id: string): Promise<VoucherItem> => {
        const response = await api.get<VoucherSingleResponse>(`/vouchers/${id}`)
        return response.data.data
    },

    getByCode: async (code: string): Promise<VoucherItem> => {
        const response = await api.get<VoucherSingleResponse>(`/vouchers/code/${code}`)
        return response.data.data
    },

    create: async (payload: VoucherCreatePayload): Promise<VoucherItem> => {
        const response = await api.post<VoucherSingleResponse>('/vouchers', payload)
        return response.data.data
    },

    update: async (id: string, payload: VoucherUpdatePayload): Promise<VoucherItem> => {
        const response = await api.put<VoucherSingleResponse>(`/vouchers/${id}`, payload)
        return response.data.data
    },

    activate: async (id: string): Promise<VoucherItem> => {
        const response = await api.patch<VoucherSingleResponse>(`/vouchers/${id}/activate`)
        return response.data.data
    },

    deactivate: async (id: string): Promise<VoucherItem> => {
        const response = await api.patch<VoucherSingleResponse>(`/vouchers/${id}/deactivate`)
        return response.data.data
    },
}
