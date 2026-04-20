import { api } from '../api'

export interface PodItemLink {
  id: string
  pod_id: string
  item_id: string
  expected_quantity: number
  current_quantity: number
  createdAt?: string
  updatedAt?: string
}

interface PodItemListResponse {
  success: boolean
  count: number
  data: PodItemLink[]
}

interface PodItemDetailResponse {
  success: boolean
  data: PodItemLink
}

interface PodItemMutationResponse {
  success: boolean
  message: string
  data?: PodItemLink
}

export interface ClusterBulkPodItemEntry {
  item_id: string
  expected_quantity?: number
  current_quantity?: number
}

export interface ClusterBulkCreatePayload {
  cluster_id: string
  items: ClusterBulkPodItemEntry[]
}

export interface ClusterBulkCreateResult {
  cluster_id: string
  pod_count: number
  input_item_count: number
  unique_item_count: number
  total_target_pairs: number
  created_count: number
  skipped_existing_count: number
  message: string
}

interface ClusterBulkCreateResponse {
  success: boolean
  message: string
  data: ClusterBulkCreateResult
}

export interface PodItemFilters {
  pod_id?: string
  item_id?: string
}

export interface CreatePodItemPayload {
  pod_id: string
  item_id: string
  expected_quantity?: number
  current_quantity?: number
}

export interface UpdatePodItemPayload {
  expected_quantity?: number
  current_quantity?: number
}

export const podItemApi = {
  getAll: (filters?: PodItemFilters) => {
    const params = new URLSearchParams()
    if (filters?.pod_id) params.append('pod_id', filters.pod_id)
    if (filters?.item_id) params.append('item_id', filters.item_id)
    return api.get<PodItemListResponse>('/pod-items', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<PodItemDetailResponse>(`/pod-items/${id}`).then((r) => r.data),

  create: (payload: CreatePodItemPayload) => api.post<PodItemMutationResponse>('/pod-items', payload).then((r) => r.data),

  createForClusterBulk: (payload: ClusterBulkCreatePayload) => {
    return api.post<ClusterBulkCreateResponse>('/pod-items/cluster/bulk', payload).then((r) => r.data)
  },

  update: (id: string, payload: UpdatePodItemPayload) => api.put<PodItemMutationResponse>(`/pod-items/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<PodItemMutationResponse>(`/pod-items/${id}`).then((r) => r.data)
}