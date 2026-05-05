import { createAsyncThunk } from '@reduxjs/toolkit'
import {
    pricingRuleApi,
    type PricingRuleCreatePayload,
    type PricingRuleFilters,
    type PricingRuleItem,
    type PricingRuleListResult,
    type PricingRuleUpdatePayload
} from '../../api/lib/pricingRuleApi'

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

export interface FetchPricingRulesArgs extends PricingRuleFilters {
    append?: boolean
}

export interface FetchPricingRulesResult extends PricingRuleListResult {
    append: boolean
}

export const fetchPricingRules = createAsyncThunk<
    FetchPricingRulesResult,
    FetchPricingRulesArgs | void,
    { rejectValue: string }
>('pricingRules/fetchPricingRules', async (args, { rejectWithValue }) => {
    try {
        const append = args?.append ?? false
        const { append: _append, ...filters } = args ?? {}
        const response = await pricingRuleApi.list(filters)

        return {
            items: response.data,
            pagination: response.pagination,
            append
        }
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the tai danh sach pricing rules'))
    }
})

export const createPricingRule = createAsyncThunk<
    PricingRuleItem,
    PricingRuleCreatePayload,
    { rejectValue: string }
>('pricingRules/createPricingRule', async (payload, { rejectWithValue }) => {
    try {
        const response = await pricingRuleApi.create(payload)
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the tao pricing rule'))
    }
})

export const updatePricingRule = createAsyncThunk<
    PricingRuleItem,
    { id: string; payload: PricingRuleUpdatePayload },
    { rejectValue: string }
>('pricingRules/updatePricingRule', async ({ id, payload }, { rejectWithValue }) => {
    try {
        const response = await pricingRuleApi.update(id, payload)
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the cap nhat pricing rule'))
    }
})

export const deactivatePricingRule = createAsyncThunk<
    PricingRuleItem,
    string,
    { rejectValue: string }
>('pricingRules/deactivatePricingRule', async (id, { rejectWithValue }) => {
    try {
        const response = await pricingRuleApi.deactivate(id)
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Khong the vo hieu hoa pricing rule'))
    }
})
