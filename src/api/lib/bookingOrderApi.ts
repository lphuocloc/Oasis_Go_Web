import { api } from '../api'
import type { BookingItem } from './bookingApi'

export const BOOKING_ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'PARTIAL_CANCEL',
  'FULLY_CANCELLED',
  'CANCEL'
] as const

export type BookingOrderStatus = (typeof BOOKING_ORDER_STATUSES)[number]

export interface BookingOrderItem {
  id: string
  user_id: string
  total_base_price?: number
  total_discount?: number
  final_total_price?: number
  status: BookingOrderStatus
  bookings_count?: number
  user?: {
    name?: string
    email?: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface BookingOrderPagination {
  total: number
  page: number
  limit: number
  pages: number
}

export interface BookingOrderListFilters {
  user_id?: string
  status?: BookingOrderStatus
  start_date?: string
  end_date?: string
  pod_ids?: string
  page?: number
  limit?: number
}

export interface BookingOrderDetail {
  order: BookingOrderItem
  bookings: BookingItem[]
  podcluster?: {
    id: string
    name?: string
    location_id?: string
  } | null
}

interface ApiResponse<TData> {
  success: boolean
  message?: string
  data: TData
}

interface BookingOrderListPayload {
  orders: BookingOrderItem[]
  pagination: BookingOrderPagination
}

const buildParams = (filters?: BookingOrderListFilters): URLSearchParams => {
  const params = new URLSearchParams()

  if (!filters) return params

  if (filters.user_id) params.append('user_id', filters.user_id)
  if (filters.status) params.append('status', filters.status)
  if (filters.start_date) params.append('start_date', filters.start_date)
  if (filters.end_date) params.append('end_date', filters.end_date)
  if (filters.pod_ids) params.append('pod_ids', filters.pod_ids)
  if (filters.page) params.append('page', String(filters.page))
  if (filters.limit) params.append('limit', String(filters.limit))

  return params
}

export const bookingOrderApi = {
  getAll: async (filters?: BookingOrderListFilters): Promise<BookingOrderListPayload> => {
    const params = buildParams(filters)
    const response = await api.get<ApiResponse<BookingOrderListPayload>>('/booking-orders', { params })
    return response.data.data
  },

  getById: async (id: string): Promise<BookingOrderDetail> => {
    const response = await api.get<ApiResponse<BookingOrderDetail>>(`/booking-orders/${id}`)
    return response.data.data
  }
}
