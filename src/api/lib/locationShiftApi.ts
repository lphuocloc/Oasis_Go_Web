import { api } from '../api'
import type { StaffShiftItem, StaffShiftRole } from './staffShiftApi'

export interface LocationShiftItem {
  id: string
  location_id: string
  shift_id: string
  created_at?: string
}

export interface LocationShiftCreatePayload {
  location_id: string
  shift_id: string
}

export interface WorkingStaffFilters {
  target_date?: string
  work_date?: string
  role?: StaffShiftRole
  include_assigned?: boolean
}

export interface WorkingStaffUser {
  id?: string
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
  message: string
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

  if (filters?.target_date) {
    params.append('target_date', filters.target_date)
  }

  if (filters?.work_date) {
    params.append('work_date', filters.work_date)
  }

  if (filters?.role) {
    params.append('role', filters.role)
  }

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

import { api } from '../api'

export interface WorkingStaffFilters {
  target_date?: string
  role?: 'CLEANER' | 'MANAGER'
  include_assigned?: boolean
}

interface WorkingStaffUser {
  id?: string
  _id?: string
  name?: string
  email?: string
  phone?: string
  role?: string
}

interface WorkingStaffShift {
  id: string
  role: 'CLEANER' | 'MANAGER'
  shift_name: string
  start_time: string
  end_time: string
  is_active?: boolean
}

interface WorkingStaffLocationShift {
  id: string
  location_id: string
  shift_id: string
}

export interface WorkingStaffAssignment {
  assignment_id: string
  start_date?: string
  end_date?: string
  status: string
  checkin_at?: string | null
  checkout_at?: string | null
  staff: WorkingStaffUser | null
  shift: WorkingStaffShift | null
  location_shift: WorkingStaffLocationShift | null
}

interface WorkingStaffResponse {
  success: boolean
  message?: string
  location: {
    id: string
    name?: string
    type?: string
  }
  count: number
  data: WorkingStaffAssignment[]
}

const buildParams = (filters?: WorkingStaffFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (!filters) return params

  if (filters.target_date?.trim()) params.append('target_date', filters.target_date.trim())
  if (filters.role) params.append('role', filters.role)
  if (filters.include_assigned !== undefined) params.append('include_assigned', String(filters.include_assigned))

  return params
}

export const locationShiftApi = {
  getWorkingStaffByLocation: (locationId: string, filters?: WorkingStaffFilters) => {
    const params = buildParams(filters)
    return api.get<WorkingStaffResponse>(`/location-shifts/locations/${locationId}/working`, { params }).then((r) => r.data)
  }
}
