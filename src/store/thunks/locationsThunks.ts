import { createAsyncThunk } from '@reduxjs/toolkit'
import { locationApi, type LocationItem, type LocationPayload } from '../../api/lib/locationApi'

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

export const fetchLocations = createAsyncThunk<
    LocationItem[],
    void,
    { rejectValue: string }
>('locations/fetchLocations', async (_, { rejectWithValue }) => {
    try {
        const response = await locationApi.getAll()
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to load locations'))
    }
})

interface UpdateLocationArgs {
    id: string
    payload: LocationPayload
}

export const updateLocation = createAsyncThunk<
    LocationItem,
    UpdateLocationArgs,
    { rejectValue: string }
>('locations/updateLocation', async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
        const response = await locationApi.update(id, payload)
        await dispatch(fetchLocations())
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to update location'))
    }
})
