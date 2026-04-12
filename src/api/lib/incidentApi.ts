import { api } from '../api'

export const INCIDENT_STATUSES = [
  'PENDING',
  'RESOLVED',
  'DISMISSED'
] as const

export const INCIDENT_SEVERITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
] as const

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]
export type IncidentDetailType = 'ITEM' | 'SERVICE'
export type IncidentType = 'OPERATIONAL' | 'DAMAGE_REPORT'

export interface IncidentDetailLine {
  type: IncidentDetailType
  item_id?: string | null
  service_catalog_id?: string | null
  name_snapshot?: string | null
  unit_cost_snapshot?: number
  quantity?: number
  total_cost?: number
  note?: string | null
}

export interface IncidentPricing {
  estimated_item_value?: number
  estimated_service_fee?: number
  estimated_total_value?: number
  currency?: string
  pricing_source?: string | null
}

export interface DamageReportContext {
  pod_id?: string | null
  pod_name?: string | null
  booking_id?: string | null
  cleaning_task_id?: string | null
  reported_by?: string | null
  user_id?: string | null
  user_name?: string | null
  cleaner_name?: string | null
}

export interface IncidentItem {
  id: string
  incident_type?: IncidentType
  pod_id: string
  booking_id?: string | null
  cleaning_task_id?: string | null
  handled_by?: string | null
  reported_by: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  details?: IncidentDetailLine[]
  photo_urls?: string[]
  estimated_service_fee?: number
  estimated_total_value?: number
  pricing_source?: string | null
  created_at: string
  updated_at: string
}

export interface DamageReportItem {
  report_id: string
  incident_type: 'DAMAGE_REPORT'
  status: IncidentStatus
  severity: IncidentSeverity
  description: string
  context: DamageReportContext
  details: IncidentDetailLine[]
  pricing: IncidentPricing
  photo_urls: string[]
  created_at: string
  updated_at: string
}

export interface PaginationMeta {
  current_page: number
  total_pages: number
  total_items: number
  items_per_page: number
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

interface DamageReportsListResponse {
  success: boolean
  count: number
  data: DamageReportItem[]
  pagination?: PaginationMeta
}

export interface IncidentListFilters {
  pod_ids?: string
  pod_id?: string
  cleaning_task_id?: string
  booking_id?: string
  reported_by?: string
  incident_type?: IncidentType
  item_id?: string
  severity?: IncidentSeverity
  status?: IncidentStatus
  from?: string
  to?: string
  page?: number
  limit?: number
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
  if (filters?.incident_type) params.append('incident_type', filters.incident_type)
  if (filters?.item_id) params.append('item_id', filters.item_id)
  if (filters?.severity) params.append('severity', filters.severity)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.from) params.append('from', filters.from)
  if (filters?.to) params.append('to', filters.to)
  if (filters?.page) params.append('page', String(filters.page))
  if (filters?.limit) params.append('limit', String(filters.limit))
  return params
}

export const incidentApi = {
  getAll: (filters?: IncidentListFilters) => {
    const params = buildParams(filters)
    return api.get<IncidentsListResponse>('/incidents', { params }).then((r) => r.data)
  },

  getDamageReports: (filters?: IncidentListFilters) => {
    const params = buildParams(filters)
    return api.get<DamageReportsListResponse>('/incidents/damage-reports', { params }).then((r) => r.data)
  },

  getMyPendingReviews: (filters?: Omit<IncidentListFilters, 'status'>) => {
    const params = buildParams(filters)
    return api.get<DamageReportsListResponse>('/incidents/my-pending-reviews', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<IncidentSingleResponse>(`/incidents/${id}`).then((r) => r.data),

  updateStatus: (id: string, payload: IncidentStatusUpdatePayload) =>
    api.patch<IncidentSingleResponse>(`/incidents/${id}/status`, payload).then((r) => r.data),
}
