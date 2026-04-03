import { api } from '../api'

export const SUPPORT_REQUEST_STATUSES = ['PENDING', 'PROCESSING', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'REJECTED'] as const
export type SupportRequestStatus = (typeof SUPPORT_REQUEST_STATUSES)[number]

export const SUPPORT_REQUEST_TYPES = ['MAINTENANCE', 'CHANGE_POD'] as const
export type SupportRequestType = (typeof SUPPORT_REQUEST_TYPES)[number]

export const SUPPORT_MAINTENANCE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export type SupportMaintenanceSeverity = (typeof SUPPORT_MAINTENANCE_SEVERITIES)[number]

export interface SupportRequestItem {
  id: string
  user_id?: string
  booking_id?: string | null
  pod_id?: string | null
  location_id?: string | null
  type?: SupportRequestType | string
  description?: string | null
  images?: string[]
  severity?: SupportMaintenanceSeverity | string | null
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
  type?: SupportRequestType
  severity?: SupportMaintenanceSeverity
  booking_id?: string
  page?: number
  limit?: number
}

export interface UpdateSupportRequestStatusPayload {
  status: SupportRequestStatus
  severity?: SupportMaintenanceSeverity
  escalation_note?: string
  resolution_note?: string
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

export interface RoomChangeCandidatePod {
  id?: string
  pod_id?: string
  code?: string
  pod_code?: string
  name?: string
  pod_name?: string
  status?: string
  cluster_id?: string
  location_id?: string
  scope_level?: 'SAME_CLUSTER' | 'SAME_PARENT_LOCATION' | string
  buffer_minutes_applied?: number
}

interface RoomChangeCandidatesResponse {
  success: boolean
  message?: string
  data: RoomChangeCandidatePod[] | {
    request?: SupportRequestItem
    booking?: unknown
    current_pod?: unknown
    candidates?: RoomChangeCandidatePod[]
  }
}

export interface ExecuteRoomChangePayload {
  target_pod_id: string
  old_pod_next_status?: 'MAINTENANCE' | 'NEEDS_CLEANING'
  old_pod_reason?: string
  severity?: SupportMaintenanceSeverity
  escalation_note?: string
  resolution_note?: string
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
  if (filters.severity) params.append('severity', filters.severity)
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
  },

  getRoomChangeCandidates: async (id: string): Promise<RoomChangeCandidatePod[]> => {
    const response = await api.get<RoomChangeCandidatesResponse>(`/support-requests/${id}/room-change-candidates`)
    const payload = response.data.data
    if (Array.isArray(payload)) return payload
    return payload?.candidates ?? []
  },

  executeRoomChange: async (id: string, payload: ExecuteRoomChangePayload): Promise<SupportRequestItem> => {
    const response = await api.patch<SupportRequestSingleResponse>(`/support-requests/${id}/room-change`, payload)
    return response.data.data
  }
}
