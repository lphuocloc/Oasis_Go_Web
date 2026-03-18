import { api } from '../../api'

export interface WarehouseItem {
  id: string
  name: string
  address?: string | null
  created_at?: string
}

interface WarehouseListResponse {
  success: boolean
  count: number
  data: WarehouseItem[]
}

interface WarehouseSingleResponse {
  success: boolean
  data: WarehouseItem
}

interface WarehouseMutationResponse {
  success: boolean
  message: string
  data?: WarehouseItem
}

export interface WarehouseFilters {
  name?: string
}

export interface CreateWarehousePayload {
  name: string
  address?: string
}

export interface UpdateWarehousePayload {
  name?: string
  address?: string
}

export const warehouseApi = {
  getAll: (filters?: WarehouseFilters) => {
    const params = new URLSearchParams()
    if (filters?.name) params.append('name', filters.name)
    return api.get<WarehouseListResponse>('/warehouses', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<WarehouseSingleResponse>(`/warehouses/${id}`).then((r) => r.data),

  create: (payload: CreateWarehousePayload) => api.post<WarehouseMutationResponse>('/warehouses', payload).then((r) => r.data),

  update: (id: string, payload: UpdateWarehousePayload) => api.put<WarehouseMutationResponse>(`/warehouses/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<WarehouseMutationResponse>(`/warehouses/${id}`).then((r) => r.data)
}
