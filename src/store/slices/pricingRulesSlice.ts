import { createSlice } from '@reduxjs/toolkit'
import type { PricingRuleItem, PricingRulePagination } from '../../api/lib/pricingRuleApi'
import type { RootState } from '../index'
import {
    createPricingRule,
    deactivatePricingRule,
    fetchPricingRules,
    updatePricingRule
} from '../thunks/pricingRulesThunks'

interface PricingRulesState {
    items: PricingRuleItem[]
    pagination: PricingRulePagination
    isLoading: boolean
    isSaving: boolean
    error: string | null
}

const initialState: PricingRulesState = {
    items: [],
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        current_page: 1,
        total_pages: 1,
        total_items: 0,
        items_per_page: 20
    },
    isLoading: false,
    isSaving: false,
    error: null
}

const pricingRulesSlice = createSlice({
    name: 'pricingRules',
    initialState,
    reducers: {
        clearPricingRulesError: (state) => {
            state.error = null
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPricingRules.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchPricingRules.fulfilled, (state, action) => {
                state.isLoading = false
                state.items = action.payload.append
                    ? [...state.items, ...action.payload.items]
                    : action.payload.items
                state.pagination = {
                    ...state.pagination,
                    ...action.payload.pagination
                }
            })
            .addCase(fetchPricingRules.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload ?? 'Failed to load pricing rules'
            })
            .addCase(createPricingRule.pending, (state) => {
                state.isSaving = true
                state.error = null
            })
            .addCase(createPricingRule.fulfilled, (state, action) => {
                state.isSaving = false
                state.items = [action.payload, ...state.items]
            })
            .addCase(createPricingRule.rejected, (state, action) => {
                state.isSaving = false
                state.error = action.payload ?? 'Failed to create pricing rule'
            })
            .addCase(updatePricingRule.pending, (state) => {
                state.isSaving = true
                state.error = null
            })
            .addCase(updatePricingRule.fulfilled, (state, action) => {
                state.isSaving = false
                const index = state.items.findIndex((item) => item.id === action.payload.id)
                if (index !== -1) {
                    state.items[index] = action.payload
                }
            })
            .addCase(updatePricingRule.rejected, (state, action) => {
                state.isSaving = false
                state.error = action.payload ?? 'Failed to update pricing rule'
            })
            .addCase(deactivatePricingRule.pending, (state) => {
                state.isSaving = true
                state.error = null
            })
            .addCase(deactivatePricingRule.fulfilled, (state, action) => {
                state.isSaving = false
                const index = state.items.findIndex((item) => item.id === action.payload.id)
                if (index !== -1) {
                    state.items[index] = action.payload
                }
            })
            .addCase(deactivatePricingRule.rejected, (state, action) => {
                state.isSaving = false
                state.error = action.payload ?? 'Failed to deactivate pricing rule'
            })
    }
})

export const { clearPricingRulesError } = pricingRulesSlice.actions

export const selectPricingRulesState = (state: RootState) => state.pricingRules
export const selectPricingRules = (state: RootState) => state.pricingRules.items
export const selectPricingRulesPagination = (state: RootState) => state.pricingRules.pagination
export const selectPricingRulesLoading = (state: RootState) => state.pricingRules.isLoading
export const selectPricingRulesSaving = (state: RootState) => state.pricingRules.isSaving
export const selectPricingRulesError = (state: RootState) => state.pricingRules.error

export default pricingRulesSlice.reducer
