import { api } from '../api'

export interface LocationWarehouseItem {
  id: string
  location_id: string
  warehouse_id: string
  created_at?: string
}

interface LocationWarehouseListResponse {
  success: boolean
  count: number
  data: LocationWarehouseItem[]
}

interface LocationWarehouseSingleResponse {
  success: boolean
  data: LocationWarehouseItem
}

interface LocationWarehouseMutationResponse {
  success: boolean
  message: string
  data?: LocationWarehouseItem
}

export interface EffectiveLocationWarehouseItem extends LocationWarehouseItem {
  requested_location_id: string
  source_type: 'direct' | 'inherited'
  source_location_id: string
  resolution_depth: number
}

export interface EffectiveLocationWarehouseTraceItem {
  location_id: string
  depth: number
  mapping_count: number
  matched: boolean
}

interface EffectiveLocationWarehouseListResponse {
  success: boolean
  count: number
  data: EffectiveLocationWarehouseItem[]
}

interface EffectiveLocationWarehouseDebugResponse extends EffectiveLocationWarehouseListResponse {
  trace: EffectiveLocationWarehouseTraceItem[]
}

export interface LocationWarehouseFilters {
  location_id?: string
  warehouse_id?: string
}

export interface CreateLocationWarehousePayload {
  location_id: string
  warehouse_id: string
}

export interface UpdateLocationWarehousePayload {
  location_id?: string
  warehouse_id?: string
}

export const locationWarehouseApi = {
  getAll: (filters?: LocationWarehouseFilters) => {
    const params = new URLSearchParams()
    if (filters?.location_id) params.append('location_id', filters.location_id)
    if (filters?.warehouse_id) params.append('warehouse_id', filters.warehouse_id)
    return api.get<LocationWarehouseListResponse>('/location-warehouses', { params }).then((r: any) => r.data)
  },

  getById: (id: string) => api.get<LocationWarehouseSingleResponse>(`/location-warehouses/${id}`).then((r: any) => r.data),

  getEffective: (locationId: string) => api.get<EffectiveLocationWarehouseListResponse>(`/location-warehouses/effective/${locationId}`).then((r: any) => r.data),

  getEffectiveDebug: (locationId: string) => api.get<EffectiveLocationWarehouseDebugResponse>(`/location-warehouses/effective/${locationId}/debug`).then((r: any) => r.data),

  create: (payload: CreateLocationWarehousePayload) => api.post<LocationWarehouseMutationResponse>('/location-warehouses', payload).then((r: any) => r.data),

  update: (id: string, payload: UpdateLocationWarehousePayload) => api.put<LocationWarehouseMutationResponse>(`/location-warehouses/${id}`, payload).then((r: any) => r.data),

  delete: (id: string) => api.delete<LocationWarehouseMutationResponse>(`/location-warehouses/${id}`).then((r: any) => r.data)
}
