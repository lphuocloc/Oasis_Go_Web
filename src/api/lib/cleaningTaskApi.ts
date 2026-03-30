import { api } from '../api'

export const CLEANING_TASK_STATUSES = [
  'ASSIGNED',
  'NOTIFIED',
  'ACCEPTED',
  'ARRIVED',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
  'MISSED'
] as const

export type CleaningTaskStatus = typeof CLEANING_TASK_STATUSES[number]

export interface CleaningTaskItem {
  id: string
  pod_id: string
  booking_id?: string | null
  cleaner_id: string
  shift_assignment_id?: string | null
  request_source: string
  due_at?: string | null
  assigned_at?: string | null
  notified_at?: string | null
  accepted_at?: string | null
  start_time?: string | null
  end_time?: string | null
  status: CleaningTaskStatus
  note?: string | null
  rejection_reason?: string | null
  reassigned_from_cleaner_id?: string | null
  created_at: string
}

export interface CleaningTasksListResponse {
  success: boolean
  count: number
  data: CleaningTaskItem[]
}

export interface CleaningTaskSingleResponse {
  success: boolean
  message?: string
  data: CleaningTaskItem
}

export interface CleaningTaskCreatePayload {
  pod_id: string
  booking_id?: string
  cleaner_id: string
  shift_assignment_id?: string
  request_source?: string
  due_at?: string
  status?: CleaningTaskStatus
  note?: string
}

export interface CleaningTaskUpdatePayload {
  pod_id?: string
  booking_id?: string
  cleaner_id?: string
  shift_assignment_id?: string
  request_source?: string
  due_at?: string
  status?: CleaningTaskStatus
  note?: string
  rejection_reason?: string
  reassigned_from_cleaner_id?: string
}

export interface CleaningTaskListFilters {
  pod_ids?: string
  pod_id?: string
  booking_id?: string
  cleaner_id?: string
  shift_assignment_id?: string
  status?: CleaningTaskStatus
  request_source?: string
  due_from?: string
  due_to?: string
}

const buildParams = (filters?: CleaningTaskListFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters?.pod_ids) params.append('pod_ids', filters.pod_ids)
  if (filters?.pod_id) params.append('pod_id', filters.pod_id)
  if (filters?.booking_id) params.append('booking_id', filters.booking_id)
  if (filters?.cleaner_id) params.append('cleaner_id', filters.cleaner_id)
  if (filters?.shift_assignment_id) params.append('shift_assignment_id', filters.shift_assignment_id)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.request_source) params.append('request_source', filters.request_source)
  if (filters?.due_from) params.append('due_from', filters.due_from)
  if (filters?.due_to) params.append('due_to', filters.due_to)
  return params
}

export const cleaningTaskApi = {
  create: (payload: CleaningTaskCreatePayload) => {
    return api.post<CleaningTaskSingleResponse>('/cleaning-tasks', payload).then((r) => r.data)
  },

  getAll: (filters?: CleaningTaskListFilters) => {
    const params = buildParams(filters)
    return api.get<CleaningTasksListResponse>('/cleaning-tasks', { params }).then((r) => r.data)
  },

  getMyTasks: (filters?: CleaningTaskListFilters) => {
    const params = buildParams(filters)
    return api.get<CleaningTasksListResponse>('/cleaning-tasks/me', { params }).then((r) => r.data)
  },

  getById: (id: string) => {
    return api.get<CleaningTaskSingleResponse>(`/cleaning-tasks/${id}`).then((r) => r.data)
  },

  update: (id: string, payload: CleaningTaskUpdatePayload) => {
    return api.put<CleaningTaskSingleResponse>(`/cleaning-tasks/${id}`, payload).then((r) => r.data)
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; message: string }>(`/cleaning-tasks/${id}`).then((r) => r.data)
  },

  backfill: (payload: { dry_run?: boolean; cleaner_access_only?: boolean; from_date?: string; to_date?: string; limit?: number }) => {
    return api.post<{ success: boolean; message: string; data: any }>('/cleaning-tasks/backfill', payload).then((r) => r.data)
  }
}
