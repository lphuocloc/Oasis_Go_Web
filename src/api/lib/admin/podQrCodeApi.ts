import { api } from '../../api'

export interface PodQrCodeItem {
  id: string
  pod_id: string
  qr_token: string
  expires_at: string
  is_active: boolean
  createdAt?: string
  updatedAt?: string
}

interface PodQrCodeListResponse {
  success: boolean
  count: number
  data: PodQrCodeItem[]
}

interface PodQrCodeDetailResponse {
  success: boolean
  data: PodQrCodeItem
}

interface PodQrCodeMutationResponse {
  success: boolean
  message: string
  data?: PodQrCodeItem
}

export interface PodQrCodeFilters {
  pod_id?: string
  is_active?: 'true' | 'false'
}

export interface CreatePodQrCodePayload {
  pod_id: string
  expires_at: string
  qr_token?: string
  is_active?: boolean
}

export interface UpdatePodQrCodePayload {
  expires_at?: string
  qr_token?: string
  is_active?: boolean
}

export const podQrCodeApi = {
  getAll: (filters?: PodQrCodeFilters) => {
    const params = new URLSearchParams()
    if (filters?.pod_id) params.append('pod_id', filters.pod_id)
    if (filters?.is_active) params.append('is_active', filters.is_active)
    return api.get<PodQrCodeListResponse>('/pod-qr-codes', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<PodQrCodeDetailResponse>(`/pod-qr-codes/${id}`).then((r) => r.data),

  create: (payload: CreatePodQrCodePayload) => api.post<PodQrCodeMutationResponse>('/pod-qr-codes', payload).then((r) => r.data),

  update: (id: string, payload: UpdatePodQrCodePayload) => api.put<PodQrCodeMutationResponse>(`/pod-qr-codes/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<PodQrCodeMutationResponse>(`/pod-qr-codes/${id}`).then((r) => r.data)
}