import { api } from '../../api'

export interface PodDeviceItem {
  id: string
  pod_id: string
  device_name: string
  device_id: string
  auth_token?: string | null
  is_online?: boolean
  last_ping?: string | null
  createdAt?: string
  updatedAt?: string
}

interface PodDeviceListResponse {
  success: boolean
  count: number
  data: PodDeviceItem[]
}

interface PodDeviceDetailResponse {
  success: boolean
  data: PodDeviceItem
}

interface PodDeviceMutationResponse {
  success: boolean
  message: string
  data?: PodDeviceItem
}

export interface PodDeviceFilters {
  pod_id?: string
  is_online?: 'true' | 'false'
}

export interface CreatePodDevicePayload {
  pod_id: string
  device_name: string
  device_id: string
  auth_token?: string
  is_online?: boolean
  last_ping?: string
}

export interface UpdatePodDevicePayload {
  device_name?: string
  device_id?: string
  auth_token?: string
  is_online?: boolean
  last_ping?: string
}

export const podDeviceApi = {
  getAll: (filters?: PodDeviceFilters) => {
    const params = new URLSearchParams()
    if (filters?.pod_id) params.append('pod_id', filters.pod_id)
    if (filters?.is_online) params.append('is_online', filters.is_online)
    return api.get<PodDeviceListResponse>('/pod-devices', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<PodDeviceDetailResponse>(`/pod-devices/${id}`).then((r) => r.data),

  create: (payload: CreatePodDevicePayload) => api.post<PodDeviceMutationResponse>('/pod-devices', payload).then((r) => r.data),

  update: (id: string, payload: UpdatePodDevicePayload) => api.put<PodDeviceMutationResponse>(`/pod-devices/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<PodDeviceMutationResponse>(`/pod-devices/${id}`).then((r) => r.data)
}