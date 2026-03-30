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

export const CLEANING_REQUEST_SOURCES = [
  'USER_REQUEST',
  'AUTO_AFTER_CHECKOUT',
  'SYSTEM_RETRY'
] as const

export type CleaningTaskStatus = (typeof CLEANING_TASK_STATUSES)[number]
export type CleaningRequestSource = (typeof CLEANING_REQUEST_SOURCES)[number]

export interface CleaningTaskItem {
  id: string
  pod_id: string
  booking_id?: string | null
  cleaner_id: string
  shift_assignment_id?: string | null
  request_source: CleaningRequestSource
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
  created_at?: string
  updated_at?: string
}

export interface CleaningTaskListFilters {
  cleaner_id?: string
  shift_assignment_id?: string
  pod_id?: string
  booking_id?: string
  status?: CleaningTaskStatus | 'all'
  request_source?: CleaningRequestSource | 'all'
  due_from?: string
  due_to?: string
}

export interface CreateCleaningTaskPayload {
  pod_id: string
  booking_id?: string | null
  cleaner_id: string
  shift_assignment_id?: string | null
  request_source?: CleaningRequestSource
  due_at?: string | null
  assigned_at?: string | null
  notified_at?: string | null
  accepted_at?: string | null
  start_time?: string | null
  end_time?: string | null
  status?: CleaningTaskStatus
  note?: string | null
  rejection_reason?: string | null
  reassigned_from_cleaner_id?: string | null
}

export type UpdateCleaningTaskPayload = Partial<CreateCleaningTaskPayload>

export interface CleaningTaskBackfillPayload {
  dry_run?: boolean
  cleaner_access_only?: boolean
  from_date?: string
  to_date?: string
  limit?: number
}

interface CleaningTaskListResponse {
  success: boolean
  count: number
  data: CleaningTaskItem[]
}

interface CleaningTaskSingleResponse {
  success: boolean
  message?: string
  data: CleaningTaskItem
}

interface CleaningTaskDeleteResponse {
  success: boolean
  message: string
}

interface CleaningTaskBackfillResponse {
  success: boolean
  message: string
  data: {
    dry_run: boolean
    cleaner_access_only: boolean
    scanned: number
    created_count: number
    skipped_count: number
    failed_count: number
    created_booking_ids: string[]
    skipped: Array<{ booking_id: string; reason: string }>
    failed: Array<{ booking_id: string; reason: string }>
  }
}

const buildParams = (filters?: CleaningTaskListFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (!filters) return params

  if (filters.cleaner_id?.trim()) params.append('cleaner_id', filters.cleaner_id.trim())
  if (filters.shift_assignment_id?.trim()) params.append('shift_assignment_id', filters.shift_assignment_id.trim())
  if (filters.pod_id?.trim()) params.append('pod_id', filters.pod_id.trim())
  if (filters.booking_id?.trim()) params.append('booking_id', filters.booking_id.trim())
  if (filters.status && filters.status !== 'all') params.append('status', filters.status)
  if (filters.request_source && filters.request_source !== 'all') params.append('request_source', filters.request_source)
  if (filters.due_from?.trim()) params.append('due_from', filters.due_from.trim())
  if (filters.due_to?.trim()) params.append('due_to', filters.due_to.trim())

  return params
}

export const cleaningTaskApi = {
  getAll: (filters?: CleaningTaskListFilters) => {
    const params = buildParams(filters)
    return api.get<CleaningTaskListResponse>('/cleaning-tasks', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<CleaningTaskSingleResponse>(`/cleaning-tasks/${id}`).then((r) => r.data),

  create: (payload: CreateCleaningTaskPayload) => {
    return api.post<CleaningTaskSingleResponse>('/cleaning-tasks', payload).then((r) => r.data)
  },

  update: (id: string, payload: UpdateCleaningTaskPayload) => {
    return api.put<CleaningTaskSingleResponse>(`/cleaning-tasks/${id}`, payload).then((r) => r.data)
  },

  delete: (id: string) => api.delete<CleaningTaskDeleteResponse>(`/cleaning-tasks/${id}`).then((r) => r.data),

  backfill: (payload?: CleaningTaskBackfillPayload) => {
    return api.post<CleaningTaskBackfillResponse>('/cleaning-tasks/backfill', payload ?? {}).then((r) => r.data)
  }
}
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
