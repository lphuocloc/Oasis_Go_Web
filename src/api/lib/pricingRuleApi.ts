import { api } from '../api'

export interface PricingRuleItem {
    id: string
    location_id: string
    start_time: string
    end_time: string
    days_of_week: string[]
    multiplier: number
    is_active: boolean
    createdAt?: string
    updatedAt?: string
}

export interface PricingRulePagination {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    current_page?: number
    total_pages?: number
    total_items?: number
    items_per_page?: number
}

export interface PricingRuleFilters {
    location_id?: string
    is_active?: boolean
    page?: number
    limit?: number
}

interface PricingRuleListResponse {
    success: boolean
    data: PricingRuleItem[]
    pagination?: PricingRulePagination
}

interface PricingRuleSingleResponse {
    success: boolean
    message?: string
    data: PricingRuleItem
}

export interface PricingRuleListResult {
    items: PricingRuleItem[]
    pagination?: PricingRulePagination
}

export interface PricingRuleCreatePayload {
    location_id?: string
    location_ids?: string[]
    start_time: string
    end_time: string
    days_of_week: string[]
    multiplier: number
    is_active?: boolean
    price_modifier?: number
}

export interface PricingRuleUpdatePayload {
    start_time?: string
    end_time?: string
    days_of_week?: string[]
    multiplier?: number
    is_active?: boolean
    price_modifier?: number
}

const buildParams = (filters?: PricingRuleFilters): URLSearchParams => {
    const params = new URLSearchParams()

    if (!filters) return params

    if (filters.location_id) params.append('location_id', filters.location_id)
    if (typeof filters.is_active === 'boolean') params.append('is_active', String(filters.is_active))
    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))

    return params
}

export const pricingRuleApi = {
    list: (filters?: PricingRuleFilters) => {
        const params = buildParams(filters)
        return api.get<PricingRuleListResponse>('/pricing-rules', { params }).then((r) => r.data)
    },

    create: (payload: PricingRuleCreatePayload) => {
        return api.post<PricingRuleSingleResponse>('/pricing-rules', payload).then((r) => r.data)
    },

    update: (id: string, payload: PricingRuleUpdatePayload) => {
        return api.put<PricingRuleSingleResponse>(`/pricing-rules/${id}`, payload).then((r) => r.data)
    },

    deactivate: (id: string) => {
        return api.delete<PricingRuleSingleResponse>(`/pricing-rules/${id}`).then((r) => r.data)
    }
}
