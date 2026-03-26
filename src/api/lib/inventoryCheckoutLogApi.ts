import { api } from '../api'

export const INVENTORY_ACTION_TYPES = ['CHECKOUT', 'RETURN', 'WASTE', 'INITIAL', 'ADJUSTMENT', 'ITEM_DELETED'] as const

export type InventoryActionType = (typeof INVENTORY_ACTION_TYPES)[number]

export interface InventoryCheckoutLogItem {
  id: string
  inventory_stock_id: string
  staff_id: string
  cleaning_task_id?: string | null
  maintenance_task_id?: string | null
  quantity: number
  action_type: InventoryActionType
  reason?: string | null
  created_at?: string
}

interface InventoryCheckoutLogListResponse {
  success: boolean
  count: number
  data: InventoryCheckoutLogItem[]
}

interface InventoryCheckoutLogSingleResponse {
  success: boolean
  data: InventoryCheckoutLogItem
}

interface InventoryCheckoutLogMutationResponse {
  success: boolean
  message: string
  data?: InventoryCheckoutLogItem
}

export interface InventoryCheckoutLogFilters {
  inventory_stock_id?: string
  staff_id?: string
  action_type?: InventoryActionType
  from?: string
  to?: string
}

export interface CreateInventoryCheckoutLogPayload {
  inventory_stock_id: string
  staff_id: string
  quantity: number
  action_type: InventoryActionType
  reason?: string | null
  cleaning_task_id?: string | null
  maintenance_task_id?: string | null
}

export interface UpdateInventoryCheckoutLogPayload {
  inventory_stock_id?: string
  staff_id?: string
  quantity?: number
  action_type?: InventoryActionType
  reason?: string | null
  cleaning_task_id?: string | null
  maintenance_task_id?: string | null
}

export const inventoryCheckoutLogApi = {
  getAll: (filters?: InventoryCheckoutLogFilters) => {
    const params = new URLSearchParams()
    if (filters?.inventory_stock_id) params.append('inventory_stock_id', filters.inventory_stock_id)
    if (filters?.staff_id) params.append('staff_id', filters.staff_id)
    if (filters?.action_type) params.append('action_type', filters.action_type)
    if (filters?.from) params.append('from', filters.from)
    if (filters?.to) params.append('to', filters.to)
    return api.get<InventoryCheckoutLogListResponse>('/inventory-checkout-logs', { params }).then((r) => r.data)
  },

  getById: (id: string) => api.get<InventoryCheckoutLogSingleResponse>(`/inventory-checkout-logs/${id}`).then((r) => r.data),

  create: (payload: CreateInventoryCheckoutLogPayload) => api.post<InventoryCheckoutLogMutationResponse>('/inventory-checkout-logs', payload).then((r) => r.data),

  update: (id: string, payload: UpdateInventoryCheckoutLogPayload) => api.put<InventoryCheckoutLogMutationResponse>(`/inventory-checkout-logs/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete<InventoryCheckoutLogMutationResponse>(`/inventory-checkout-logs/${id}`).then((r) => r.data)
}
