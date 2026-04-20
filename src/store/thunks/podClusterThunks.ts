import { createAsyncThunk } from '@reduxjs/toolkit'
import {
    podClusterApi,
    type PodClusterImage,
    type PodClusterItem,
    type PodClusterPayload
} from '../../api/lib/podClusterApi'
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

export const fetchPodClusterLocations = createAsyncThunk<
    LocationItem[],
    void,
    { rejectValue: string }
>('podClusters/fetchLocations', async (_, { rejectWithValue }) => {
    try {
        const response = await locationApi.getAll({ isActive: 'all', type: 'all' })
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to load locations'))
    }
})

export const fetchPodClusters = createAsyncThunk<
    PodClusterItem[],
    string,
    { rejectValue: string }
>('podClusters/fetchAll', async (locationFilter, { rejectWithValue }) => {
    try {
        const response = await podClusterApi.getAll(locationFilter === 'all' ? undefined : locationFilter)
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to load pod clusters'))
    }
})

export const fetchPodClusterImages = createAsyncThunk<
    { clusterId: string; images: PodClusterImage[] },
    string,
    { rejectValue: string }
>('podClusters/fetchImages', async (clusterId, { rejectWithValue }) => {
    try {
        const response = await podClusterApi.getImages(clusterId)
        return { clusterId, images: response.data }
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to load cluster images'))
    }
})

export const createPodCluster = createAsyncThunk<
    PodClusterItem,
    PodClusterPayload,
    { rejectValue: string }
>('podClusters/create', async (payload, { rejectWithValue }) => {
    try {
        const response = await podClusterApi.create(payload)
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to create pod cluster'))
    }
})

interface UpdatePodClusterArgs {
    id: string
    payload: PodClusterPayload
}

export const updatePodCluster = createAsyncThunk<
    PodClusterItem,
    UpdatePodClusterArgs,
    { rejectValue: string }
>('podClusters/update', async ({ id, payload }, { rejectWithValue }) => {
    try {
        const response = await podClusterApi.update(id, payload)
        return response.data
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to update pod cluster'))
    }
})

export const deletePodCluster = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>('podClusters/delete', async (id, { rejectWithValue }) => {
    try {
        await podClusterApi.delete(id)
        return id
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to delete pod cluster'))
    }
})

interface DeletePodClusterImageArgs {
    clusterId: string
    imageId: string
}

export const deletePodClusterImage = createAsyncThunk<
    DeletePodClusterImageArgs,
    DeletePodClusterImageArgs,
    { rejectValue: string }
>('podClusters/deleteImage', async ({ clusterId, imageId }, { rejectWithValue }) => {
    try {
        await podClusterApi.deleteImage(clusterId, imageId)
        return { clusterId, imageId }
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to delete image'))
    }
})
