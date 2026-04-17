import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { LocationItem } from '../../api/lib/locationApi'
import type { PodClusterImage, PodClusterItem } from '../../api/lib/podClusterApi'
import type { RootState } from '../index'
import {
    createPodCluster,
    deletePodCluster,
    deletePodClusterImage,
    fetchPodClusterImages,
    fetchPodClusterLocations,
    fetchPodClusters,
    updatePodCluster
} from '../thunks/podClusterThunks'

interface PodClustersState {
    items: PodClusterItem[]
    locations: LocationItem[]
    imagesByClusterId: Record<string, PodClusterImage[]>
    imagesLoadingByClusterId: Record<string, boolean>
    isLoading: boolean
    isSaving: boolean
    error: string | null
    locationFilter: string
}

const initialState: PodClustersState = {
    items: [],
    locations: [],
    imagesByClusterId: {},
    imagesLoadingByClusterId: {},
    isLoading: false,
    isSaving: false,
    error: null,
    locationFilter: 'all'
}

const podClustersSlice = createSlice({
    name: 'podClusters',
    initialState,
    reducers: {
        clearPodClustersError: (state) => {
            state.error = null
        },
        setPodClusterLocationFilter: (state, action: PayloadAction<string>) => {
            state.locationFilter = action.payload
        },
        clearPodClusterImages: (state, action: PayloadAction<string>) => {
            delete state.imagesByClusterId[action.payload]
            delete state.imagesLoadingByClusterId[action.payload]
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPodClusterLocations.fulfilled, (state, action) => {
                state.locations = action.payload
            })
            .addCase(fetchPodClusterLocations.rejected, (state, action) => {
                state.error = action.payload ?? 'Failed to load locations'
            })
            .addCase(fetchPodClusters.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchPodClusters.fulfilled, (state, action) => {
                state.isLoading = false
                state.items = action.payload
            })
            .addCase(fetchPodClusters.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload ?? 'Failed to load pod clusters'
            })
            .addCase(fetchPodClusterImages.pending, (state, action) => {
                state.imagesLoadingByClusterId[action.meta.arg] = true
            })
            .addCase(fetchPodClusterImages.fulfilled, (state, action) => {
                state.imagesLoadingByClusterId[action.payload.clusterId] = false
                state.imagesByClusterId[action.payload.clusterId] = action.payload.images
            })
            .addCase(fetchPodClusterImages.rejected, (state, action) => {
                state.imagesLoadingByClusterId[action.meta.arg] = false
                state.imagesByClusterId[action.meta.arg] = []
                state.error = action.payload ?? 'Failed to load cluster images'
            })
            .addCase(createPodCluster.pending, (state) => {
                state.isSaving = true
                state.error = null
            })
            .addCase(createPodCluster.fulfilled, (state, action) => {
                state.isSaving = false
                state.items = [action.payload, ...state.items]
            })
            .addCase(createPodCluster.rejected, (state, action) => {
                state.isSaving = false
                state.error = action.payload ?? 'Failed to create pod cluster'
            })
            .addCase(updatePodCluster.pending, (state) => {
                state.isSaving = true
                state.error = null
            })
            .addCase(updatePodCluster.fulfilled, (state, action) => {
                state.isSaving = false
                const index = state.items.findIndex((item) => item.id === action.payload.id)
                if (index !== -1) {
                    state.items[index] = action.payload
                }
            })
            .addCase(updatePodCluster.rejected, (state, action) => {
                state.isSaving = false
                state.error = action.payload ?? 'Failed to update pod cluster'
            })
            .addCase(deletePodCluster.pending, (state) => {
                state.isSaving = true
                state.error = null
            })
            .addCase(deletePodCluster.fulfilled, (state, action) => {
                state.isSaving = false
                state.items = state.items.filter((item) => item.id !== action.payload)
                delete state.imagesByClusterId[action.payload]
                delete state.imagesLoadingByClusterId[action.payload]
            })
            .addCase(deletePodCluster.rejected, (state, action) => {
                state.isSaving = false
                state.error = action.payload ?? 'Failed to delete pod cluster'
            })
            .addCase(deletePodClusterImage.pending, (state) => {
                state.isSaving = true
                state.error = null
            })
            .addCase(deletePodClusterImage.fulfilled, (state, action) => {
                state.isSaving = false
                const { clusterId, imageId } = action.payload
                state.imagesByClusterId[clusterId] = (state.imagesByClusterId[clusterId] ?? []).filter(
                    (image) => image.id !== imageId
                )
            })
            .addCase(deletePodClusterImage.rejected, (state, action) => {
                state.isSaving = false
                state.error = action.payload ?? 'Failed to delete image'
            })
    }
})

export const {
    clearPodClustersError,
    setPodClusterLocationFilter,
    clearPodClusterImages
} = podClustersSlice.actions

export const selectPodClustersState = (state: RootState) => state.podClusters
export const selectPodClusters = (state: RootState) => state.podClusters.items
export const selectPodClusterLocations = (state: RootState) => state.podClusters.locations
export const selectPodClustersLoading = (state: RootState) => state.podClusters.isLoading
export const selectPodClustersSaving = (state: RootState) => state.podClusters.isSaving
export const selectPodClustersError = (state: RootState) => state.podClusters.error
export const selectPodClusterImagesByClusterId = (state: RootState) => state.podClusters.imagesByClusterId
export const selectPodClusterImagesLoadingByClusterId = (
    state: RootState
) => state.podClusters.imagesLoadingByClusterId
export const selectPodClusterLocationFilter = (state: RootState) => state.podClusters.locationFilter

export default podClustersSlice.reducer
