import { api } from '../api'

export interface StaffWorkRosterItem {
  id: string
  staff_id: string
  location_shift_id: string
  day_of_week: number
  is_active: boolean
  created_at?: string
}

export interface StaffWorkRosterCreatePayload {
  staff_id: string
  location_shift_id: string
  day_of_week: number
  is_active?: boolean
}

export interface StaffWorkRosterUpdatePayload {
  staff_id?: string
  location_shift_id?: string
  day_of_week?: number
  is_active?: boolean
}

export interface StaffWorkRosterFilters {
  staff_id?: string
  location_shift_id?: string
  day_of_week?: number
  is_active?: boolean
}

interface StaffWorkRosterListResponse {
  success: boolean
  count: number
  data: StaffWorkRosterItem[]
}

interface StaffWorkRosterSingleResponse {
  success: boolean
  message?: string
  data: StaffWorkRosterItem
}

interface StaffWorkRosterDeleteResponse {
  success: boolean
  message: string
}

const buildParams = (filters?: StaffWorkRosterFilters): URLSearchParams => {
  const params = new URLSearchParams()

  if (filters?.staff_id) {
    params.append('staff_id', filters.staff_id)
  }

  if (filters?.location_shift_id) {
    params.append('location_shift_id', filters.location_shift_id)
  }

  if (typeof filters?.day_of_week === 'number') {
    params.append('day_of_week', String(filters.day_of_week))
  }

  if (typeof filters?.is_active === 'boolean') {
    params.append('is_active', String(filters.is_active))
  }

  return params
}

export const staffWorkRosterApi = {
  create: (payload: StaffWorkRosterCreatePayload) => {
    return api.post<StaffWorkRosterSingleResponse>('/staff-work-rosters', payload).then((r) => r.data)
  },

  getAll: (filters?: StaffWorkRosterFilters) => {
    const params = buildParams(filters)
    return api.get<StaffWorkRosterListResponse>('/staff-work-rosters', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<StaffWorkRosterSingleResponse>(`/staff-work-rosters/${id}`).then((r) => r.data),

  update: (id: string, payload: StaffWorkRosterUpdatePayload) => {
    return api.put<StaffWorkRosterSingleResponse>(`/staff-work-rosters/${id}`, payload).then((r) => r.data)
  },

  delete: (id: string) => api.delete<StaffWorkRosterDeleteResponse>(`/staff-work-rosters/${id}`).then((r) => r.data)
}
