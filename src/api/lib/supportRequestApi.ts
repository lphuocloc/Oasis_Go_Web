import { api } from '../api'

export const SUPPORT_REQUEST_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED'] as const
export type SupportRequestStatus = (typeof SUPPORT_REQUEST_STATUSES)[number]

export interface SupportRequestItem {
  id: string
  user_id?: string
  booking_id?: string | null
  pod_id?: string | null
  location_id?: string | null
  type?: 'CLEANING' | 'MAINTENANCE' | 'OTHERS' | string
  description?: string | null
  images?: string[]
  status: SupportRequestStatus
  handled_by?: string | null
  handled_at?: string | null
  created_at?: string
  updated_at?: string
  user?: {
    id: string
    full_name?: string | null
    email?: string | null
    phone?: string | null
  }
  booking?: {
    id: string
    pod_id?: string | null
    start_time?: string
    end_time?: string
    status?: string
  }
  pod?: {
    id: string
    code?: string
    name?: string
    cluster_id?: string
  }
  location?: {
    id: string
    name?: string
  }
}

export interface SupportRequestPagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface SupportRequestListFilters {
  status?: SupportRequestStatus
  type?: 'CLEANING' | 'MAINTENANCE' | 'OTHERS'
  booking_id?: string
  page?: number
  limit?: number
}

export interface UpdateSupportRequestStatusPayload {
  status: SupportRequestStatus
}

interface SupportRequestListPayload {
  support_requests?: SupportRequestItem[]
  requests?: SupportRequestItem[]
  pagination?: SupportRequestPagination
}

interface SupportRequestListResponse {
  success: boolean
  message?: string
  data: SupportRequestItem[] | SupportRequestListPayload
  pagination?: SupportRequestPagination
}

interface SupportRequestSingleResponse {
  success: boolean
  message?: string
  data: SupportRequestItem
}

export interface SupportRequestListResult {
  supportRequests: SupportRequestItem[]
  pagination?: SupportRequestPagination
}

const buildParams = (filters?: SupportRequestListFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (!filters) return params

  if (filters.status) params.append('status', filters.status)
  if (filters.type) params.append('type', filters.type)
  if (filters.booking_id?.trim()) params.append('booking_id', filters.booking_id.trim())
  if (filters.page) params.append('page', String(filters.page))
  if (filters.limit) params.append('limit', String(filters.limit))

  return params
}

const normalizeList = (payload: SupportRequestListResponse): SupportRequestListResult => {
  if (Array.isArray(payload.data)) {
    return {
      supportRequests: payload.data,
      pagination: payload.pagination
    }
  }

  const supportRequests = payload.data.support_requests ?? payload.data.requests ?? []
  return {
    supportRequests,
    pagination: payload.data.pagination ?? payload.pagination
  }
}

export const supportRequestApi = {
  getAll: async (filters?: SupportRequestListFilters): Promise<SupportRequestListResult> => {
    const params = buildParams(filters)
    const response = await api.get<SupportRequestListResponse>('/support-requests', { params })
    return normalizeList(response.data)
  },

  updateStatus: async (id: string, payload: UpdateSupportRequestStatusPayload): Promise<SupportRequestItem> => {
    const response = await api.patch<SupportRequestSingleResponse>(`/support-requests/${id}/status`, payload)
    return response.data.data
  }
}
