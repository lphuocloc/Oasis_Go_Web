import { api } from '../api'

export const LOST_FOUND_STATUSES = [
  'FOUND',
  'IN_STORAGE',
  'CLAIM_PENDING',
  'RETURNED',
  'DISPOSED'
] as const

export type LostFoundStatus = (typeof LOST_FOUND_STATUSES)[number]

export const LOST_ITEM_REQUEST_STATUSES = [
  'PENDING',
  'MATCHED',
  'CLOSED',
  'REJECTED'
] as const

export type LostItemRequestStatus = (typeof LOST_ITEM_REQUEST_STATUSES)[number]

export interface LostFoundItem {
  id: string
  pod_id?: string | null
  booking_id?: string | null
  found_by_user_id: string
  warehouse_id?: string | null
  item_name: string
  description?: string | null
  photo_urls?: string[] // Backend returns array of media urls
  found_at: string
  status: LostFoundStatus
  claimed_by_user_id?: string | null
  claimed_at?: string | null
  created_at: string
  updated_at: string
  serial_number: string

  // Mapped entities
  pod?: {
    id: string
    code: string
    name: string
  }
  found_by_user?: {
    id: string
    name: string
    phone?: string
  }
}

export interface LostItemRequest {
  id: string
  user_id: string
  booking_id: string
  item_name_reported: string
  description_reported?: string | null
  status: LostItemRequestStatus
  matched_found_item_id?: string[]
  manager_note?: string | null
  created_at: string
  updated_at: string

  // Populated fields if any
  user?: {
    id: string
    full_name: string
    phone_number: string
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

interface LostItemRequestListResponse {
  success: boolean
  count: number
  data: LostItemRequest[]
  pagination?: PaginationMeta
}

interface LostFoundSingleResponse {
  success: boolean
  message?: string
  data: LostFoundItem
}

interface LostItemRequestSingleResponse {
  success: boolean
  message?: string
  data: LostItemRequest
}

export interface LostFoundListFilters {
  pod_id?: string
  booking_id?: string
  found_by_user_id?: string
  serial_number?: string
  status?: LostFoundStatus
  page?: number
  limit?: number
}

export interface LostItemRequestListFilters {
  status?: LostItemRequestStatus
  user_id?: string
  page?: number
  limit?: number
}

export interface LostFoundCreatePayload {
  pod_id: string
  item_name: string
  description?: string
  found_at?: string
  media?: File[]
}

const buildParams = (filters?: any): URLSearchParams => {
  const params = new URLSearchParams()
  if (!filters) return params
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null) {
      params.append(key, String(filters[key]))
    }
  })
  return params
}

export const lostFoundApi = {
  // --- Items ---
  getAll: (filters?: LostFoundListFilters) => {
    const params = buildParams(filters)
    return api.get<LostFoundListResponse>('/lost-found-items', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<LostFoundSingleResponse>(`/lost-found-items/${id}`).then((r) => r.data),

  create: (payload: LostFoundCreatePayload) => {
    const formData = new FormData()
    formData.append('pod_id', payload.pod_id)
    formData.append('item_name', payload.item_name)
    if (payload.description) formData.append('description', payload.description)
    if (payload.found_at) formData.append('found_at', payload.found_at)
    if (payload.media) {
      payload.media.forEach(file => formData.append('media', file))
    }

    return api.post<LostFoundSingleResponse>('/lost-found-items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((r) => r.data)
  },

  storeToWarehouse: (id: string, warehouse_id: string) =>
    api.post<LostFoundSingleResponse>(`/lost-found-items/${id}/store`, { warehouse_id }).then((r) => r.data),

  generateHandoverOTP: (id: string) =>
    api.post<{ success: boolean, message: string, otp: string, otp_expires_at: string }>(`/lost-found-items/${id}/generate-otp`).then((r) => r.data),

  confirmHandover: (id: string, otp: string) =>
    api.post<LostFoundSingleResponse>(`/lost-found-items/${id}/handover`, { otp }).then((r) => r.data),

  // --- Requests ---
  getRequests: (filters?: LostItemRequestListFilters) => {
    const params = buildParams(filters)
    return api.get<LostItemRequestListResponse>('/lost-found-items/requests', { params }).then((r) => r.data)
  },

  getRequestById: (id: string) => api.get<LostItemRequestSingleResponse>(`/lost-found-items/requests/${id}`).then((r) => r.data),

  matchRequest: (id: string, payload: { found_item_id: string[], manager_note?: string, close_others?: boolean }) =>
    api.post<{ success: boolean, message: string, data: { request: LostItemRequest, matched_count: number } }>(`/lost-found-items/requests/${id}/match`, payload).then((r) => r.data),

  rejectRequest: (id: string, payload: { manager_note?: string }) =>
    api.post<LostItemRequestSingleResponse>(`/lost-found-items/requests/${id}/reject`, payload).then((r) => r.data),
}
