import { api } from '../api'

export const INCIDENT_STATUSES = [
  'PENDING',
  'INVESTIGATING',
  'RESOLVED',
  'CLOSED'
] as const

export const INCIDENT_SEVERITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
] as const

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

export interface IncidentItem {
  id: string
  pod_id: string
  booking_id?: string | null
  cleaning_task_id?: string | null
  shift_assignment_id?: string | null
  reported_by: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  has_lost_found: boolean
  photo_urls: string[]
  created_at: string
  updated_at: string
}

interface IncidentsListResponse {
  success: boolean
  count: number
  data: IncidentItem[]
}

interface IncidentSingleResponse {
  success: boolean
  message?: string
  data: IncidentItem
}

export interface IncidentListFilters {
  pod_ids?: string
  pod_id?: string
  cleaning_task_id?: string
  booking_id?: string
  reported_by?: string
  status?: IncidentStatus
}

export interface IncidentStatusUpdatePayload {
  status: IncidentStatus
}

const buildParams = (filters?: IncidentListFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters?.pod_ids) params.append('pod_ids', filters.pod_ids)
  if (filters?.pod_id) params.append('pod_id', filters.pod_id)
  if (filters?.cleaning_task_id) params.append('cleaning_task_id', filters.cleaning_task_id)
  if (filters?.booking_id) params.append('booking_id', filters.booking_id)
  if (filters?.reported_by) params.append('reported_by', filters.reported_by)
  if (filters?.status) params.append('status', filters.status)
  return params
}

export const incidentApi = {
  getAll: (filters?: IncidentListFilters) => {
    const params = buildParams(filters)
    return api.get<IncidentsListResponse>('/incidents', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<IncidentSingleResponse>(`/incidents/${id}`).then((r) => r.data),

  updateStatus: (id: string, payload: IncidentStatusUpdatePayload) =>
    api.patch<IncidentSingleResponse>(`/incidents/${id}/status`, payload).then((r) => r.data),
}
