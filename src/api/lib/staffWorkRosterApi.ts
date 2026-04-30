import { api } from '../api'

export interface StaffWorkRosterItem {
  id: string
  staff_id: string
  shift_id: string
  location_id: string | null
  cluster_id: string | null
  is_active: boolean
  created_at?: string
}

export interface StaffWorkRosterCreatePayload {
  staff_id: string
  shift_id: string
  location_id?: string
  cluster_id?: string
  is_active?: boolean
}

export interface StaffWorkRosterUpdatePayload {
  shift_id?: string
  location_id?: string
  cluster_id?: string
  is_active?: boolean
}

export interface StaffWorkRosterFilters {
  staff_id?: string
  shift_id?: string
  location_id?: string
  cluster_id?: string
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

  if (filters?.staff_id) params.append('staff_id', filters.staff_id)
  if (filters?.shift_id) params.append('shift_id', filters.shift_id)
  if (filters?.location_id) params.append('location_id', filters.location_id)
  if (filters?.cluster_id) params.append('cluster_id', filters.cluster_id)
  if (typeof filters?.is_active === 'boolean') params.append('is_active', String(filters.is_active))

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
