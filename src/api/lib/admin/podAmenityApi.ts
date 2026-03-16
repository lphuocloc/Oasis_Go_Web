import { api } from '../../api'

export interface PodAmenityItem {
  id: string
  pod_id: string
  name: string
  value?: string | null
  createdAt?: string
  updatedAt?: string
}

interface PodAmenityListResponse {
  success: boolean
  count: number
  data: PodAmenityItem[]
}

interface PodAmenityDetailResponse {
  success: boolean
  data: PodAmenityItem
}

interface PodAmenityMutationResponse {
  success: boolean
  message: string
  data?: PodAmenityItem
}

export interface PodAmenityFilters {
  pod_id?: string
  name?: string
}

export interface CreatePodAmenityPayload {
  pod_id: string
  name: string
  value?: string
}

export interface UpdatePodAmenityPayload {
  name?: string
  value?: string
}

export const podAmenityApi = {
  getAll: (filters?: PodAmenityFilters) => {
    const params = new URLSearchParams()
    if (filters?.pod_id) params.append('pod_id', filters.pod_id)
    if (filters?.name) params.append('name', filters.name)
    return api.get<PodAmenityListResponse>('/pod-amenities', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<PodAmenityDetailResponse>(`/pod-amenities/${id}`).then((r) => r.data),

  create: (payload: CreatePodAmenityPayload) => api.post<PodAmenityMutationResponse>('/pod-amenities', payload).then((r) => r.data),

  update: (id: string, payload: UpdatePodAmenityPayload) => api.put<PodAmenityMutationResponse>(`/pod-amenities/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<PodAmenityMutationResponse>(`/pod-amenities/${id}`).then((r) => r.data)
}