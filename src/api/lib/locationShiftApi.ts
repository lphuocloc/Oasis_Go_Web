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
  }
}
