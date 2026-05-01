import { api } from '../api'

export interface StaffAttendanceLogItem {
  id: string
  staff_id: string
  shift_id: string | null
  location_id: string | null
  cluster_id: string | null
  action: 'CHECKIN' | 'CHECKOUT'
  work_date: string | null
  created_at: string
  // Virtual-populated fields (when populated by backend)
  staff?: { id: string; name: string; email: string; role: string } | null
  location?: { id: string; name: string } | null
  cluster?: { id: string; name: string } | null
}

export interface StaffAttendanceLogFilters {
  staff_id?: string
  location_id?: string
  cluster_id?: string
  action?: 'CHECKIN' | 'CHECKOUT'
  date?: string        // YYYY-MM-DD
  from_date?: string
  to_date?: string
  page?: number
  limit?: number
}

interface StaffAttendanceLogListResponse {
  success: boolean
  count: number
  data: StaffAttendanceLogItem[]
}

interface StaffAttendanceLogSingleResponse {
  success: boolean
  data: StaffAttendanceLogItem
}

const buildParams = (filters?: StaffAttendanceLogFilters): URLSearchParams => {
  const params = new URLSearchParams()

  if (filters?.staff_id) params.append('staff_id', filters.staff_id)
  if (filters?.location_id) params.append('location_id', filters.location_id)
  if (filters?.cluster_id) params.append('cluster_id', filters.cluster_id)
  if (filters?.action) params.append('action', filters.action)
  if (filters?.date) params.append('date', filters.date)
  if (filters?.from_date) params.append('from_date', filters.from_date)
  if (filters?.to_date) params.append('to_date', filters.to_date)
  if (filters?.page) params.append('page', String(filters.page))
  if (filters?.limit) params.append('limit', String(filters.limit))

  return params
}

export const staffAttendanceLogApi = {
  getAll: (filters?: StaffAttendanceLogFilters) => {
    const params = buildParams(filters)
    return api.get<StaffAttendanceLogListResponse>('/staff-attendance-logs', { params }).then((r) => r.data)
  },

  getById: (id: string) =>
    api.get<StaffAttendanceLogSingleResponse>(`/staff-attendance-logs/${id}`).then((r) => r.data),

  getTodayStatus: (bustCache?: boolean) =>
    api.get<{ success: boolean; data: {
      date: string
      checked_in_today: boolean
      checked_out_today: boolean
      can_checkin: boolean
      checkin_count: number
      checkout_count: number
      latest_checkin_at: string | null
      latest_checkout_at: string | null
      shift_ids: string[]
      has_handover: boolean
    } }>('/staff-attendance-logs/me/today-status', {
      params: bustCache ? { _t: Date.now() } : undefined
    }).then((r) => r.data),

  checkin: () =>
    api.post<{ success: boolean; message: string; data: StaffAttendanceLogItem }>('/staff-attendance-logs/checkin').then((r) => r.data),

  checkout: () =>
    api.post<{ success: boolean; message: string; data: StaffAttendanceLogItem }>('/staff-attendance-logs/checkout').then((r) => r.data),
}
