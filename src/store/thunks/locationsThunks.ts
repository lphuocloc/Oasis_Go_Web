import { createAsyncThunk } from '@reduxjs/toolkit'
import { locationApi, type LocationItem } from '../../api/lib/locationApi'

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
