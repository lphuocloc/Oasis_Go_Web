import { api } from '../api'

export type TimeSlotStatus = 'AVAILABLE' | 'RESERVED'

export interface TimeSlotItem {
  id: string
  pod_id: string
  start_time: string
  end_time: string
  status: TimeSlotStatus
  createdAt?: string
  updatedAt?: string
}

interface TimeSlotListResponse {
  success: boolean
  count: number
  data: TimeSlotItem[]
}

interface TimeSlotDetailResponse {
  success: boolean
  data: TimeSlotItem
}

interface TimeSlotMutationResponse {
  success: boolean
  message: string
  data?: TimeSlotItem
}

export interface TimeSlotFilters {
  pod_id?: string
  status?: TimeSlotStatus
  start_date?: string
  end_date?: string
}

export interface CreateTimeSlotPayload {
  pod_id: string
  start_time: string
  end_time: string
  status?: TimeSlotStatus
}

export interface UpdateTimeSlotPayload {
  start_time?: string
  end_time?: string
  status?: TimeSlotStatus
}

const buildParams = (filters?: TimeSlotFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters?.pod_id) params.append('pod_id', filters.pod_id)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  return params
}

export const timeSlotApi = {
  getAll: (filters?: TimeSlotFilters) => {
    const params = buildParams(filters)
    return api.get<TimeSlotListResponse>('/timeslots', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<TimeSlotDetailResponse>(`/timeslots/${id}`).then((r) => r.data),

  create: (payload: CreateTimeSlotPayload) => api.post<TimeSlotMutationResponse>('/timeslots', payload).then((r) => r.data),

  update: (id: string, payload: UpdateTimeSlotPayload) => api.put<TimeSlotMutationResponse>(`/timeslots/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<TimeSlotMutationResponse>(`/timeslots/${id}`).then((r) => r.data),

  getAvailableByPod: (podId: string, start_date?: string, end_date?: string) => {
    const params = new URLSearchParams()
    if (start_date) params.append('start_date', start_date)
    if (end_date) params.append('end_date', end_date)
    return api.get<TimeSlotListResponse>(`/timeslots/available/${podId}`, { params }).then((r) => r.data)
  },

  generateByPod: (podId: string, days?: number) => api.post<TimeSlotMutationResponse>(`/timeslots/generate/${podId}`, { days }).then((r) => r.data),

  reserve: (slotIds: string[]) => api.post<TimeSlotMutationResponse>('/timeslots/reserve', { slotIds }).then((r) => r.data),

  release: (slotIds: string[]) => api.post<TimeSlotMutationResponse>('/timeslots/release', { slotIds }).then((r) => r.data),

  getClusterAvailableByDate: (clusterId: string, date: string) => {
    const params = new URLSearchParams({ date })
    return api.get<TimeSlotListResponse>(`/timeslots/cluster/${clusterId}/available`, { params }).then((r) => r.data)
  }
}