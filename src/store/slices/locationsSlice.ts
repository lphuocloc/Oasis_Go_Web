import { createSlice } from '@reduxjs/toolkit'
import type { LocationItem } from '../../api/lib/locationApi'
import type { RootState } from '../index'
import { fetchLocations, updateLocation } from '../thunks/locationsThunks'

interface LocationsState {
    items: LocationItem[]
    isLoading: boolean
    error: string | null
}

const initialState: LocationsState = {
    items: [],
    isLoading: false,
    error: null
}

const locationsSlice = createSlice({
    name: 'locations',
    initialState,
    reducers: {
        clearLocationsError: (state) => {
            state.error = null
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchLocations.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchLocations.fulfilled, (state, action) => {
                state.isLoading = false
                state.items = action.payload
            })
            .addCase(fetchLocations.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload ?? 'Failed to load locations'
            })
            .addCase(updateLocation.pending, (state) => {
                state.error = null
            })
            .addCase(updateLocation.fulfilled, (state, action) => {
                const index = state.items.findIndex((item) => item.id === action.payload.id)
                if (index !== -1) {
                    state.items[index] = action.payload
                }
            })
            .addCase(updateLocation.rejected, (state, action) => {
                state.error = action.payload ?? 'Failed to update location'
            })
    }
})

export const { clearLocationsError } = locationsSlice.actions

export const selectLocationsState = (state: RootState) => state.locations
export const selectLocations = (state: RootState) => state.locations.items
export const selectLocationsLoading = (state: RootState) => state.locations.isLoading
export const selectLocationsError = (state: RootState) => state.locations.error

export default locationsSlice.reducer
