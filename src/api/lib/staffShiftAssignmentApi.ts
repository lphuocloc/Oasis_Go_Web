import { api } from '../api'
import type { LocationShiftItem } from './locationShiftApi'
import type { StaffShiftItem } from './staffShiftApi'

export const STAFF_SHIFT_ASSIGNMENT_STATUSES = [
  'ASSIGNED',
  'CHECKED_IN',
  'COMPLETED',
  'ABSENT'
] as const

export type StaffShiftAssignmentStatus = (typeof STAFF_SHIFT_ASSIGNMENT_STATUSES)[number]

export interface StaffShiftAssignmentItem {
  id: string
  staff_id: string
  location_shift_id: string
  start_date: string
  end_date: string
  status: StaffShiftAssignmentStatus
  checkin_at?: string | null
  checkout_at?: string | null
  created_at?: string
}

export interface StaffShiftAssignmentCreatePayload {
  staff_id: string
  location_shift_id: string
  start_date: string
  end_date: string
}

export interface StaffShiftAssignmentUpdatePayload {
  start_date?: string
  end_date?: string
  status?: StaffShiftAssignmentStatus
}

export interface StaffShiftAssignmentFilters {
  staff_id?: string
  location_shift_id?: string
  status?: StaffShiftAssignmentStatus
  start_date?: string
  end_date?: string
}

export interface MyAssignmentsFilters {
  work_date?: string
  from_date?: string
  to_date?: string
  start_date?: string
  end_date?: string
  status?: StaffShiftAssignmentStatus | StaffShiftAssignmentStatus[]
}

export interface AssignmentLocation {
  id: string
  name?: string
  type?: string
  parent_id?: string | null
}

export interface MyAssignmentItem {
  assignment_id: string
  start_date: string
  end_date: string
  status: StaffShiftAssignmentStatus
  checkin_at?: string | null
  checkout_at?: string | null
  location_shift_id: string
  shift: StaffShiftItem | null
  location: AssignmentLocation | null
}

interface StaffShiftAssignmentListResponse {
  success: boolean
  count: number
  data: StaffShiftAssignmentItem[]
}

interface StaffShiftAssignmentSingleResponse {
  success: boolean
  message?: string
  data: StaffShiftAssignmentItem
}

interface StaffShiftAssignmentDeleteResponse {
  success: boolean
  message: string
}

interface MyAssignmentsResponse {
  success: boolean
  message: string
  count: number
  data: MyAssignmentItem[]
}

interface AttendanceActionPayload {
  shift_assignment_id: string
}

interface AttendanceActionResponse {
  success: boolean
  message: string
  data: StaffShiftAssignmentItem
}

const buildListParams = (filters?: StaffShiftAssignmentFilters): URLSearchParams => {
  const params = new URLSearchParams()

  if (filters?.staff_id) {
    params.append('staff_id', filters.staff_id)
  }

  if (filters?.location_shift_id) {
    params.append('location_shift_id', filters.location_shift_id)
  }

  if (filters?.status) {
    params.append('status', filters.status)
  }

  if (filters?.start_date) {
    params.append('start_date', filters.start_date)
  }

  if (filters?.end_date) {
    params.append('end_date', filters.end_date)
  }

  return params
}

const buildMyAssignmentsParams = (filters?: MyAssignmentsFilters): URLSearchParams => {
  const params = new URLSearchParams()

  if (filters?.work_date) {
    params.append('work_date', filters.work_date)
  }

  if (filters?.from_date) {
    params.append('from_date', filters.from_date)
  }

  if (filters?.to_date) {
    params.append('to_date', filters.to_date)
  }

  if (filters?.start_date) {
    params.append('start_date', filters.start_date)
  }

  if (filters?.end_date) {
    params.append('end_date', filters.end_date)
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      params.append('status', filters.status.join(','))
    } else {
      params.append('status', filters.status)
    }
  }

  return params
}

export const staffShiftAssignmentApi = {
  getMyAssignments: (filters?: MyAssignmentsFilters) => {
    const params = buildMyAssignmentsParams(filters)
    return api.get<MyAssignmentsResponse>('/staff-shift-assignments/me', { params }).then((r) => r.data)
  },

  create: (payload: StaffShiftAssignmentCreatePayload) => {
    return api.post<StaffShiftAssignmentSingleResponse>('/staff-shift-assignments', payload).then((r) => r.data)
  },

  getAll: (filters?: StaffShiftAssignmentFilters) => {
    const params = buildListParams(filters)
    return api.get<StaffShiftAssignmentListResponse>('/staff-shift-assignments', { params }).then((r) => r.data)
  },

  getById: (id: string) => {
    return api.get<StaffShiftAssignmentSingleResponse>(`/staff-shift-assignments/${id}`).then((r) => r.data)
  },

  update: (id: string, payload: StaffShiftAssignmentUpdatePayload) => {
    return api.put<StaffShiftAssignmentSingleResponse>(`/staff-shift-assignments/${id}`, payload).then((r) => r.data)
  },

  delete: (id: string) => {
    return api.delete<StaffShiftAssignmentDeleteResponse>(`/staff-shift-assignments/${id}`).then((r) => r.data)
  },

  checkin: (shift_assignment_id: string) => {
    const payload: AttendanceActionPayload = { shift_assignment_id }
    return api.post<AttendanceActionResponse>('/staff-shift-assignments/checkin', payload).then((r) => r.data)
  },

  checkout: (shift_assignment_id: string) => {
    const payload: AttendanceActionPayload = { shift_assignment_id }
    return api.post<AttendanceActionResponse>('/staff-shift-assignments/checkout', payload).then((r) => r.data)
  }
}

export type { LocationShiftItem }
