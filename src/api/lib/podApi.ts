import { api } from '../api'

export const POD_STATUSES = [
  'AVAILABLE',
  'OCCUPIED',
  'NEEDS_CLEANING',
  'CLEANING',
  'MAINTENANCE'
] as const

export type PodStatus = (typeof POD_STATUSES)[number]

export interface PodItem {
  id: string
  cluster_id: string
  cluster?: {
    id: string
    name?: string
    description?: string | null
    slot_duration_minutes?: number | null
    location?: {
      id: string
      name?: string
      type?: string
      description?: string | null
    }
  }
  code: string
  name: string
  description?: string | null
  status: PodStatus
  maintenance_status?: string | null
  soundproof_level: number
  ventilation_level: number
  power_outlets: number
  wifi_available: boolean
  max_session_duration: number
  last_cleaned_at?: string | null
  createdAt?: string
  updatedAt?: string
}

interface PodsListResponse {
  success: boolean
  count: number
  data: PodItem[]
}

interface PodSingleResponse {
  success: boolean
  message?: string
  data: PodItem
}

interface PodCreateResponse {
  success: boolean
  message: string
  count: number
  data: PodItem[]
}

interface PodDeleteResponse {
  success: boolean
  message: string
}

export interface PodListFilters {
  cluster_id?: string
  status?: PodStatus
  code?: string
}

export interface PodGridCreatePayload {
  cluster_id: string
  numRows: number
  numCols: number
  name?: string
  description?: string
  soundproof_level?: number
  ventilation_level?: number
  power_outlets?: number
  wifi_available?: boolean
  max_session_duration?: number
}

export interface PodSingleCreatePayload {
  cluster_id: string
  code: string
  name: string
  description?: string
  soundproof_level?: number
  ventilation_level?: number
  power_outlets?: number
  wifi_available?: boolean
  max_session_duration?: number
}

export type CreatePodsPayload = PodGridCreatePayload | PodSingleCreatePayload

export interface UpdatePodPayload {
  name?: string
  description?: string | null
  status?: PodStatus
  maintenance_status?: string | null
  soundproof_level?: number
  ventilation_level?: number
  power_outlets?: number
  wifi_available?: boolean
  max_session_duration?: number
}

export interface UpdatePodStatusPayload {
  status: PodStatus
  maintenance_status?: string
}

const buildParams = (filters?: PodListFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters?.cluster_id) params.append('cluster_id', filters.cluster_id)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.code) params.append('code', filters.code)
  return params
}

export const podApi = {
  createPods: (payload: CreatePodsPayload) => api.post<PodCreateResponse>('/pods/create', payload).then((r) => r.data),

  getAll: (filters?: PodListFilters) => {
    const params = buildParams(filters)
    return api.get<PodsListResponse>('/pods', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<PodSingleResponse>(`/pods/${id}`).then((r) => r.data),

  getByCluster: (clusterId: string) => api.get<PodsListResponse>(`/pods/cluster/${clusterId}`).then((r) => r.data),

  update: (id: string, payload: UpdatePodPayload) => api.put<PodSingleResponse>(`/pods/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<PodDeleteResponse>(`/pods/${id}`).then((r) => r.data),

  updateStatus: (id: string, payload: UpdatePodStatusPayload) => api.patch<PodSingleResponse>(`/pods/${id}/status`, payload).then((r) => r.data),

  completeCleaning: (id: string) => api.patch<PodSingleResponse>(`/pods/${id}/complete-cleaning`).then((r) => r.data)
}