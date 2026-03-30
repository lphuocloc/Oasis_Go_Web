import { api } from '../api'

export const MAINTENANCE_TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED'
] as const

export type MaintenanceTaskStatus = (typeof MAINTENANCE_TASK_STATUSES)[number]

export interface MaintenanceTaskItem {
  id: string
  pod_id: string
  reported_by: string
  shift_assignment_id?: string | null
  incident_id?: string | null
  description?: string | null
  status: MaintenanceTaskStatus
  created_at: string
}

interface MaintenanceTasksListResponse {
  success: boolean
  count: number
  data: MaintenanceTaskItem[]
}

interface MaintenanceTaskSingleResponse {
  success: boolean
  message?: string
  data: MaintenanceTaskItem
}

export interface MaintenanceTaskListFilters {
  pod_ids?: string
  pod_id?: string
  reported_by?: string
  shift_assignment_id?: string
  incident_id?: string
  status?: MaintenanceTaskStatus
}

export interface MaintenanceTaskCreatePayload {
  pod_id: string
  reported_by?: string
  shift_assignment_id?: string
  incident_id?: string
  description?: string
  status?: MaintenanceTaskStatus
}

export interface MaintenanceTaskUpdatePayload {
  pod_id?: string
  reported_by?: string
  shift_assignment_id?: string
  incident_id?: string
  description?: string
  status?: MaintenanceTaskStatus
}

const buildParams = (filters?: MaintenanceTaskListFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters?.pod_ids) params.append('pod_ids', filters.pod_ids)
  if (filters?.pod_id) params.append('pod_id', filters.pod_id)
  if (filters?.reported_by) params.append('reported_by', filters.reported_by)
  if (filters?.shift_assignment_id) params.append('shift_assignment_id', filters.shift_assignment_id)
  if (filters?.incident_id) params.append('incident_id', filters.incident_id)
  if (filters?.status) params.append('status', filters.status)
  return params
}

export const maintenanceTaskApi = {
  create: (payload: MaintenanceTaskCreatePayload) => api.post<MaintenanceTaskSingleResponse>('/maintenance-tasks', payload).then((r) => r.data),

  getAll: (filters?: MaintenanceTaskListFilters) => {
    const params = buildParams(filters)
    return api.get<MaintenanceTasksListResponse>('/maintenance-tasks', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<MaintenanceTaskSingleResponse>(`/maintenance-tasks/${id}`).then((r) => r.data),

  update: (id: string, payload: MaintenanceTaskUpdatePayload) => api.put<MaintenanceTaskSingleResponse>(`/maintenance-tasks/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/maintenance-tasks/${id}`).then((r) => r.data),
}
