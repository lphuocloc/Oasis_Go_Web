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
  'SYSTEM_RETRY',
  'ROOM_CHANGE_VACATED'
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

export interface CleaningTaskManagerBookingItem {
  id: string
  pod_id?: string
  booking_id?: string
  cleaner_id?: string
  status: CleaningTaskStatus
  request_source: CleaningRequestSource
  due_at?: string | null
  estimated_start_time?: string | null
  pod_name?: string | null
  location_name?: string | null
  action_label?: string | null
}

export interface CleaningTaskManagerDetail extends CleaningTaskManagerBookingItem {
  booking_status?: string | null
  pod_status?: string | null
  actual_start_time?: string | null
  actual_end_time?: string | null
}

export interface CleaningTaskMediaItem {
  id: string
  cleaning_task_id: string
  media_type: 'BEFORE' | 'AFTER'
  file_type: 'IMAGE' | 'VIDEO' | 'PHOTO' | 'FILE'
  media_url?: string
  media: {
    url: string
    public_id?: string
  }
  created_at?: string
}

export interface CleaningTaskWithMediaPayload {
  task: CleaningTaskManagerDetail
  media: {
    before: CleaningTaskMediaItem[]
    after: CleaningTaskMediaItem[]
  }
}

export interface CleaningTaskListFilters {
  pod_ids?: string
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

interface CleaningTaskManagerBookingResponse {
  success: boolean
  count: number
  data: CleaningTaskManagerBookingItem[]
}

interface CleaningTaskWithMediaResponse {
  success: boolean
  data: CleaningTaskWithMediaPayload
}

export interface CleaningMediaFilters {
  cleaning_task_id?: string
  media_type?: 'BEFORE' | 'AFTER'
  file_type?: 'IMAGE' | 'VIDEO' | 'PHOTO'
}

interface CleaningMediaListResponse {
  success: boolean
  count: number
  data: CleaningTaskMediaItem[]
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

  if (filters.pod_ids?.trim()) params.append('pod_ids', filters.pod_ids.trim())
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

  getMyTasks: (filters?: CleaningTaskListFilters) => {
    const params = buildParams(filters)
    return api.get<CleaningTaskListResponse>('/cleaning-tasks/me', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<CleaningTaskSingleResponse>(`/cleaning-tasks/${id}`).then((r) => r.data),

  getManagerCleanerBooking: (filters: CleaningTaskListFilters) => {
    const params = buildParams(filters)
    return api.get<CleaningTaskManagerBookingResponse>('/cleaning-tasks/manager/cleaner-booking', { params }).then((r) => r.data)
  },

  getWithMedia: (id: string) => api.get<CleaningTaskWithMediaResponse>(`/cleaning-tasks/${id}/with-media`).then((r) => r.data),

  getCleaningMedia: (filters: CleaningMediaFilters) => {
    const params = new URLSearchParams()
    if (filters.cleaning_task_id) params.append('cleaning_task_id', filters.cleaning_task_id)
    if (filters.media_type) params.append('media_type', filters.media_type)
    if (filters.file_type) params.append('file_type', filters.file_type)
    return api.get<CleaningMediaListResponse>('/cleaning-media', { params }).then((r) => r.data)
  },

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
