import { api } from '../../api'

export type LockStatus = 'LOCKED' | 'UNLOCKED'
export type DoorSensorStatus = 'CLOSED' | 'OPEN'

export interface DoorItem {
  id: string
  pod_id: string
  lock_status: LockStatus
  door_sensor: DoorSensorStatus
  last_sync_at?: string | null
  createdAt?: string
  updatedAt?: string
}

interface DoorListResponse {
  success: boolean
  count: number
  data: DoorItem[]
}

interface DoorDetailResponse {
  success: boolean
  data: DoorItem
}

interface DoorMutationResponse {
  success: boolean
  message: string
  data?: DoorItem
}

export interface DoorFilters {
  pod_id?: string
  lock_status?: LockStatus
  door_sensor?: DoorSensorStatus
}

export interface CreateDoorPayload {
  pod_id: string
  lock_status?: LockStatus
  door_sensor?: DoorSensorStatus
}

export interface UpdateDoorPayload {
  lock_status?: LockStatus
  door_sensor?: DoorSensorStatus
  last_sync_at?: string
}

export const doorApi = {
  getAll: (filters?: DoorFilters) => {
    const params = new URLSearchParams()
    if (filters?.pod_id) params.append('pod_id', filters.pod_id)
    if (filters?.lock_status) params.append('lock_status', filters.lock_status)
    if (filters?.door_sensor) params.append('door_sensor', filters.door_sensor)
    return api.get<DoorListResponse>('/doors', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<DoorDetailResponse>(`/doors/${id}`).then((r) => r.data),

  create: (payload: CreateDoorPayload) => api.post<DoorMutationResponse>('/doors', payload).then((r) => r.data),

  update: (id: string, payload: UpdateDoorPayload) => api.put<DoorMutationResponse>(`/doors/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<DoorMutationResponse>(`/doors/${id}`).then((r) => r.data)
}