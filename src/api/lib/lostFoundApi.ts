import { api } from '../api'

export const LOST_FOUND_STATUSES = [
  'FOUND',
  'CLAIMED',
  'DISPOSED',
  'RETURNED_TO_USER'
] as const

export type LostFoundStatus = (typeof LOST_FOUND_STATUSES)[number]

export interface LostFoundItem {
  id: string
  pod_id?: string | null
  booking_id?: string | null
  found_by_user_id: string
  warehouse_id?: string | null
  item_name: string
  description?: string | null
  photo_url?: string | null
  found_at: string
  status: LostFoundStatus
  claimed_by_user_id?: string | null
  claimed_at?: string | null
  created_at: string
  updated_at: string
  
  // Mapped entities
  pod?: {
    id: string
    code: string
    name: string
  }
}

export interface PaginationMeta {
  current_page: number
  total_pages: number
  total_items: number
  items_per_page: number
}

interface LostFoundListResponse {
  success: boolean
  count: number
  data: LostFoundItem[]
  pagination?: PaginationMeta
}

interface LostFoundSingleResponse {
  success: boolean
  message?: string
  data: LostFoundItem
}

export interface LostFoundListFilters {
  pod_id?: string
  booking_id?: string
  found_by_user_id?: string
  status?: LostFoundStatus
  page?: number
  limit?: number
}

export interface LostFoundCreatePayload {
  item_name: string
  description?: string
  pod_id?: string
  warehouse_id?: string
  photo?: File
}

export interface LostFoundStatusUpdatePayload {
  status: LostFoundStatus
}

const buildParams = (filters?: LostFoundListFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters?.pod_id) params.append('pod_id', filters.pod_id)
  if (filters?.booking_id) params.append('booking_id', filters.booking_id)
  if (filters?.found_by_user_id) params.append('found_by_user_id', filters.found_by_user_id)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.page) params.append('page', String(filters.page))
  if (filters?.limit) params.append('limit', String(filters.limit))
  return params
}

export const lostFoundApi = {
  getAll: (filters?: LostFoundListFilters) => {
    const params = buildParams(filters)
    return api.get<LostFoundListResponse>('/lost-found-items', { params }).then((r) => r.data)
  },

  getMy: (filters?: Omit<LostFoundListFilters, 'found_by_user_id'>) => {
    const params = buildParams(filters)
    return api.get<LostFoundListResponse>('/lost-found-items/my', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<LostFoundSingleResponse>(`/lost-found-items/${id}`).then((r) => r.data),

  create: (payload: LostFoundCreatePayload) => {
    const formData = new FormData()
    formData.append('item_name', payload.item_name)
    if (payload.description) formData.append('description', payload.description)
    if (payload.pod_id) formData.append('pod_id', payload.pod_id)
    if (payload.warehouse_id) formData.append('warehouse_id', payload.warehouse_id)
    if (payload.photo) formData.append('photo', payload.photo)

    return api.post<LostFoundSingleResponse>('/lost-found-items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((r) => r.data)
  },

  updateStatus: (id: string, payload: LostFoundStatusUpdatePayload) =>
    api.patch<LostFoundSingleResponse>(`/lost-found-items/${id}/status`, payload).then((r) => r.data),
}
