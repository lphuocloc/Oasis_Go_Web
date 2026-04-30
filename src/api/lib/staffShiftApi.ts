import { api } from '../api'

export const STAFF_SHIFT_NAMES = ['CA SÁNG', 'CA CHIỀU', 'CA TỐI', 'CA ĐÊM'] as const
export type StaffShiftName = (typeof STAFF_SHIFT_NAMES)[number]

export interface StaffShiftItem {
  id: string
  shift_name: StaffShiftName
  start_time: string
  end_time: string
  is_active: boolean
  created_at?: string
}

export interface StaffShiftCreatePayload {
  shift_name: StaffShiftName
  start_time: string
  end_time: string
  is_active?: boolean
}

export interface StaffShiftUpdatePayload {
  shift_name?: StaffShiftName
  start_time?: string
  end_time?: string
  is_active?: boolean
}

export interface StaffShiftFilters {
  is_active?: boolean
}

interface StaffShiftListResponse {
  success: boolean
  count: number
  data: StaffShiftItem[]
}

interface StaffShiftSingleResponse {
  success: boolean
  message?: string
  data: StaffShiftItem
}

interface StaffShiftDeleteResponse {
  success: boolean
  message: string
}

const buildParams = (filters?: StaffShiftFilters): URLSearchParams => {
  const params = new URLSearchParams()

  if (typeof filters?.is_active === 'boolean') {
    params.append('is_active', String(filters.is_active))
  }

  return params
}

export const staffShiftApi = {
  getAll: (filters?: StaffShiftFilters) => {
    const params = buildParams(filters)
    return api.get<StaffShiftListResponse>('/staff-shifts', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<StaffShiftSingleResponse>(`/staff-shifts/${id}`).then((r) => r.data),

  create: (payload: StaffShiftCreatePayload) => {
    return api.post<StaffShiftSingleResponse>('/staff-shifts/create', payload).then((r) => r.data)
  },

  update: (id: string, payload: StaffShiftUpdatePayload) => {
    return api.put<StaffShiftSingleResponse>(`/staff-shifts/${id}`, payload).then((r) => r.data)
  },

  delete: (id: string) => api.delete<StaffShiftDeleteResponse>(`/staff-shifts/${id}`).then((r) => r.data)
}
