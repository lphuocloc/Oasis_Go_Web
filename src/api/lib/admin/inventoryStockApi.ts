import { api } from '../../api'

export interface InventoryStockItem {
  id: string
  warehouse_id: string
  item_id: string
  quantity_available: number
  updated_at?: string
}

interface InventoryStockListResponse {
  success: boolean
  count: number
  data: InventoryStockItem[]
}

interface InventoryStockSingleResponse {
  success: boolean
  data: InventoryStockItem
}

interface InventoryStockMutationResponse {
  success: boolean
  message: string
  data?: InventoryStockItem
}

export interface InventoryStockFilters {
  warehouse_id?: string
  item_id?: string
}

export interface CreateInventoryStockPayload {
  warehouse_id: string
  item_id: string
  quantity_available: number
}

export interface UpdateInventoryStockPayload {
  warehouse_id?: string
  item_id?: string
  quantity_available?: number
}

export const inventoryStockApi = {
  getAll: (filters?: InventoryStockFilters) => {
    const params = new URLSearchParams()
    if (filters?.warehouse_id) params.append('warehouse_id', filters.warehouse_id)
    if (filters?.item_id) params.append('item_id', filters.item_id)
    return api.get<InventoryStockListResponse>('/inventory-stocks', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<InventoryStockSingleResponse>(`/inventory-stocks/${id}`).then((r) => r.data),

  create: (payload: CreateInventoryStockPayload) => api.post<InventoryStockMutationResponse>('/inventory-stocks', payload).then((r) => r.data),

  update: (id: string, payload: UpdateInventoryStockPayload) => api.put<InventoryStockMutationResponse>(`/inventory-stocks/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<InventoryStockMutationResponse>(`/inventory-stocks/${id}`).then((r) => r.data)
}
