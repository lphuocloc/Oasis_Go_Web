import { api } from '../api'
import type { StaffShiftItem } from './staffShiftApi'

export interface LocationShiftItem {
  id: string
  location_id: string
  shift_id: string
  created_at?: string
  location?: { id: string; name?: string; type?: string; parent_id?: string | null }
  shift?: StaffShiftItem
}

export interface LocationShiftCreatePayload {
  location_id: string
  shift_id: string
}

export interface WorkingStaffFilters {
  target_date?: string
  work_date?: string
  role?: string
  include_assigned?: boolean
}

export interface WorkingStaffUser {
  id?: string
  _id?: string
  name?: string
  email?: string
  phone?: string
  role?: string
}

export interface WorkingStaffAssignment {
  assignment_id: string
  start_date?: string
  end_date?: string
  status: string
  checkin_at?: string | null
  checkout_at?: string | null
  staff: WorkingStaffUser | null
  shift: StaffShiftItem | null
  location_shift: LocationShiftItem | null
}

export interface WorkingStaffLocation {
  id: string
  name?: string
  type?: string
}

interface LocationShiftCreateResponse {
  success: boolean
  message: string
  data: LocationShiftItem
}

interface WorkingStaffByLocationResponse {
  success: boolean
  message?: string
  location: WorkingStaffLocation
  count: number
  data: WorkingStaffAssignment[]
}

interface LocationShiftListResponse {
  success: boolean
  count: number
  data: LocationShiftItem[]
}

const buildWorkingStaffParams = (filters?: WorkingStaffFilters): URLSearchParams => {
  const params = new URLSearchParams()

  if (filters?.target_date?.trim()) params.append('target_date', filters.target_date.trim())
  if (filters?.work_date?.trim()) params.append('work_date', filters.work_date.trim())
  if (filters?.role) params.append('role', filters.role)
  if (typeof filters?.include_assigned === 'boolean') {
    params.append('include_assigned', String(filters.include_assigned))
  }

  return params
}

export const locationShiftApi = {
  create: (payload: LocationShiftCreatePayload) => {
    return api.post<LocationShiftCreateResponse>('/location-shifts/create', payload).then((r) => r.data)
  },

  getWorkingStaffByLocation: (locationId: string, filters?: WorkingStaffFilters) => {
    const params = buildWorkingStaffParams(filters)
    return api
      .get<WorkingStaffByLocationResponse>(`/location-shifts/locations/${locationId}/working`, { params })
      .then((r) => r.data)
  },

  getAll: () => {
    return api.get<LocationShiftListResponse>('/location-shifts').then((r) => r.data)
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; message: string }>(`/location-shifts/${id}`).then((r) => r.data)
  }
}
