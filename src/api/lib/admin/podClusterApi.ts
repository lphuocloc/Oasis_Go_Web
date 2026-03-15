import { api } from '../../api'

export interface PodClusterItem {
  id: string
  location_id: string
  name: string
  description?: string | null
  base_price_modifier?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface PodClusterImage {
  id: string
  cluster_id: string
  image_url: string
  createdAt?: string
}

export interface PodClusterPayload {
  location_id: string
  name: string
  description?: string | null
  base_price_modifier?: number | null
  images?: File[]
}

interface PodClustersListResponse {
  success: boolean
  count: number
  data: PodClusterItem[]
}

interface PodClusterSingleResponse {
  success: boolean
  message?: string
  data: PodClusterItem
}

interface PodClusterImagesResponse {
  success: boolean
  count: number
  data: PodClusterImage[]
}

interface PodClusterDeleteResponse {
  success: boolean
  message: string
}

const toFormData = (payload: PodClusterPayload): FormData => {
  const formData = new FormData()
  formData.append('location_id', payload.location_id)
  formData.append('name', payload.name)

  if (payload.description != null && payload.description !== '') {
    formData.append('description', payload.description)
  }

  if (payload.base_price_modifier != null) {
    formData.append('base_price_modifier', String(payload.base_price_modifier))
  }

  payload.images?.forEach((file) => {
    formData.append('images', file)
  })

  return formData
}

export const podClusterApi = {
  getAll: (location_id?: string) => {
    const params = new URLSearchParams()
    if (location_id) params.append('location_id', location_id)
    return api.get<PodClustersListResponse>('/pod-clusters', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<PodClusterSingleResponse>(`/pod-clusters/${id}`).then((r) => r.data),

  getByLocation: (locationId: string) => api.get<PodClustersListResponse>(`/pod-clusters/location/${locationId}`).then((r) => r.data),

  getImages: (id: string) => api.get<PodClusterImagesResponse>(`/pod-clusters/${id}/images`).then((r) => r.data),

  create: (payload: PodClusterPayload) => {
    return api.post<PodClusterSingleResponse>('/pod-clusters', toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data)
  },

  update: (id: string, payload: PodClusterPayload) => {
    return api.put<PodClusterSingleResponse>(`/pod-clusters/${id}`, toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data)
  },

  delete: (id: string) => api.delete<PodClusterDeleteResponse>(`/pod-clusters/${id}`).then((r) => r.data),

  deleteImage: (id: string, imageId: string) => {
    return api.delete<PodClusterDeleteResponse>(`/pod-clusters/${id}/images/${imageId}`).then((r) => r.data)
  }
}