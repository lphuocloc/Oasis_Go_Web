import { api } from '../api'

export const LOCATION_TYPES = [
  'airport',
  'terminal',
  'floor',
  'mall',
  'bus_station',
  'waiting_lounge'
] as const

export type LocationType = (typeof LOCATION_TYPES)[number]

export interface LocationItem {
  id: string
  name: string
  type: LocationType
  lat: number | null
  lng: number | null
  parent_id: string | null
  description?: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface LocationPayload {
  name: string
  type: LocationType
  lat?: number | null
  lng?: number | null
  parent_id?: string | null
  description?: string | null
  isActive?: boolean
}

interface LocationsListResponse {
  success: boolean
  count: number
  data: LocationItem[]
}

interface LocationSingleResponse {
  success: boolean
  message?: string
  data: LocationItem
}

interface LocationDeleteResponse {
  success: boolean
  message: string
}

export interface LocationListFilters {
  type?: LocationType | 'all'
  parent_id?: string | 'null'
  isActive?: 'true' | 'false' | 'all'
}

const buildParams = (filters?: LocationListFilters): URLSearchParams => {
  const params = new URLSearchParams()

  if (filters?.type && filters.type !== 'all') {
    params.append('type', filters.type)
  }

  if (filters?.parent_id) {
    params.append('parent_id', filters.parent_id)
  }

  if (filters?.isActive && filters.isActive !== 'all') {
    params.append('isActive', filters.isActive)
  }

  return params
}

export const locationApi = {
  getAll: (filters?: LocationListFilters) => {
    const params = buildParams(filters)
    return api.get<LocationsListResponse>('/locations', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<LocationSingleResponse>(`/locations/${id}`).then((r) => r.data),

  create: (payload: LocationPayload) => api.post<LocationSingleResponse>('/locations', payload).then((r) => r.data),

  update: (id: string, payload: LocationPayload) => api.put<LocationSingleResponse>(`/locations/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<LocationDeleteResponse>(`/locations/${id}`).then((r) => r.data)
}