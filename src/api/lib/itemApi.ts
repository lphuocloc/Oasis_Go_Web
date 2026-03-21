import { api } from '../api'

export interface InventoryItem {
  id: string
  name?: string | null
  item_type?: ItemType | null
  type?: ItemType | null
  code?: string | null
  sku?: string | null
  item_name?: string | null
  unit_cost?: number | null
  unitCost?: number | null
  current_quantity?: number | null
  available_quantity?: number | null
  stock_quantity?: number | null
  quantity?: number | null
  createdAt?: string
  updatedAt?: string
}

interface ItemListResponse {
  success: boolean
  count: number
  data: InventoryItem[]
}

interface ItemCreateResponse {
  success: boolean
  message?: string
  data: InventoryItem
}

interface ItemMutationResponse {
  success: boolean
  message?: string
  data?: InventoryItem
}

export type ItemType = 'CONSUMABLE' | 'REUSABLE'

export interface CreateItemPayload {
  name: string
  item_type: ItemType
  unit_cost?: number
}

export interface UpdateItemPayload {
  name?: string
  item_type?: ItemType
  unit_cost?: number
}

const ITEM_ENDPOINT_CANDIDATES = ['/items', '/item'] as const
let resolvedItemEndpoint: string | null = null

const tryGetAllWithFallback = async (): Promise<ItemListResponse> => {
  const endpoints = resolvedItemEndpoint ? [resolvedItemEndpoint] : [...ITEM_ENDPOINT_CANDIDATES]
  let lastError: any

  for (const endpoint of endpoints) {
    try {
      const response = await api.get<ItemListResponse>(endpoint)
      resolvedItemEndpoint = endpoint
      return response.data
    } catch (error: any) {
      lastError = error
      if (error?.response?.status !== 404) {
        throw error
      }
    }
  }

  throw lastError
}

const tryCreateWithFallback = async (payload: CreateItemPayload): Promise<ItemCreateResponse> => {
  const endpoints = resolvedItemEndpoint ? [resolvedItemEndpoint] : [...ITEM_ENDPOINT_CANDIDATES]
  let lastError: any

  for (const endpoint of endpoints) {
    try {
      const response = await api.post<ItemCreateResponse>(endpoint, payload)
      resolvedItemEndpoint = endpoint
      return response.data
    } catch (error: any) {
      lastError = error
      if (error?.response?.status !== 404) {
        throw error
      }
    }
  }

  throw lastError
}

const tryUpdateWithFallback = async (id: string, payload: UpdateItemPayload): Promise<ItemMutationResponse> => {
  const endpoints = resolvedItemEndpoint ? [resolvedItemEndpoint] : [...ITEM_ENDPOINT_CANDIDATES]
  let lastError: any

  for (const endpoint of endpoints) {
    try {
      const response = await api.put<ItemMutationResponse>(`${endpoint}/${id}`, payload)
      resolvedItemEndpoint = endpoint
      return response.data
    } catch (error: any) {
      lastError = error
      if (error?.response?.status !== 404) {
        throw error
      }
    }
  }

  throw lastError
}

const tryDeleteWithFallback = async (id: string): Promise<ItemMutationResponse> => {
  const endpoints = resolvedItemEndpoint ? [resolvedItemEndpoint] : [...ITEM_ENDPOINT_CANDIDATES]
  let lastError: any

  for (const endpoint of endpoints) {
    try {
      const response = await api.delete<ItemMutationResponse>(`${endpoint}/${id}`)
      resolvedItemEndpoint = endpoint
      return response.data
    } catch (error: any) {
      lastError = error
      if (error?.response?.status !== 404) {
        throw error
      }
    }
  }

  throw lastError
}

export const itemApi = {
  getAll: () => tryGetAllWithFallback(),

  create: (payload: CreateItemPayload) => tryCreateWithFallback(payload),

  update: (id: string, payload: UpdateItemPayload) => tryUpdateWithFallback(id, payload),

  delete: (id: string) => tryDeleteWithFallback(id)
}
