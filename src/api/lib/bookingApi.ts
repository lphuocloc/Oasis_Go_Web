import { api } from '../api'

export const BOOKING_STATUSES = ['BOOKED', 'IN_USE', 'COMPLETED', 'CANCELLED'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const CHECKIN_STATES = ['PENDING', 'MANUAL_CHECKED_IN', 'AUTO_ACTIVATED', 'NO_SHOW'] as const
export type CheckinState = (typeof CHECKIN_STATES)[number]

export interface BookingItem {
  id: string
  order_id: string
  user_id: string
  pod_id: string
  start_time: string
  end_time: string
  actual_end_time?: string | null
  cleaner_access_allowed?: boolean
  cleaner_access_updated_at?: string | null
  checkin_state?: CheckinState | null
  checked_in_at?: string | null
  checkin_source?: 'USER_QR' | 'SYSTEM_AUTO' | null
  auto_activated_at?: string | null
  no_show_marked_at?: string | null
  status: BookingStatus
  base_price?: number
  total_price?: number
  createdAt?: string
  updatedAt?: string
  created_at?: string
  updated_at?: string
  pod?: {
    id: string
    code?: string
    name?: string
    cluster_id?: string
  }
  order?: {
    id: string
    final_total_price?: number
    status?: string
    payment_method?: string
  }
}

export interface BookingPagination {
  current_page: number
  total_pages: number
  total_items: number
  items_per_page: number
}

export interface BookingListFilters {
  user_id?: string
  pod_id?: string
  order_id?: string
  status?: BookingStatus
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

interface ApiResponse<TData> {
  success: boolean
  message?: string
  data: TData
}

interface BookingListPayload {
  bookings: BookingItem[]
  pagination?: BookingPagination
}

interface BookingSinglePayload {
  booking: BookingItem
}

interface BookingSingleResponse {
  success: boolean
  message?: string
  data: BookingItem | BookingSinglePayload
}

interface BookingListResponse {
  success: boolean
  message?: string
  data: BookingItem[] | BookingListPayload
}

const buildParams = (filters?: BookingListFilters): URLSearchParams => {
  const params = new URLSearchParams()

  if (!filters) return params

  if (filters.user_id) params.append('user_id', filters.user_id)
  if (filters.pod_id) params.append('pod_id', filters.pod_id)
  if (filters.order_id) params.append('order_id', filters.order_id)
  if (filters.status) params.append('status', filters.status)
  if (filters.start_date) params.append('start_date', filters.start_date)
  if (filters.end_date) params.append('end_date', filters.end_date)
  if (filters.page) params.append('page', String(filters.page))
  if (filters.limit) params.append('limit', String(filters.limit))

  return params
}

const normalizeSingleBooking = (payload: BookingSingleResponse): BookingItem => {
  if ('booking' in payload.data) {
    return payload.data.booking
  }

  return payload.data
}

const normalizeBookingList = (payload: BookingListResponse): BookingListPayload => {
  if (Array.isArray(payload.data)) {
    return { bookings: payload.data }
  }

  return {
    bookings: payload.data.bookings ?? [],
    pagination: payload.data.pagination
  }
}

export const bookingApi = {
  getAll: async (filters?: BookingListFilters): Promise<BookingListPayload> => {
    const params = buildParams(filters)
    const response = await api.get<BookingListResponse>('/bookings', { params })
    return normalizeBookingList(response.data)
  },

  getById: async (id: string): Promise<BookingItem> => {
    const response = await api.get<BookingSingleResponse>(`/bookings/${id}`)
    return normalizeSingleBooking(response.data)
  },

  getByPod: async (podId: string, status?: BookingStatus): Promise<BookingItem[]> => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)

    const response = await api.get<ApiResponse<BookingItem[]>>(`/bookings/pod/${podId}`, { params })
    return response.data.data
  },

  getByOrder: async (orderId: string): Promise<BookingItem[]> => {
    const response = await api.get<ApiResponse<BookingItem[]>>(`/bookings/order/${orderId}`)
    return response.data.data
  },

  setCleanerAccess: async (bookingId: string, allowed: boolean): Promise<BookingItem> => {
    const response = await api.post<BookingSingleResponse>(`/bookings/${bookingId}/cleaner-access`, { allowed })
    return normalizeSingleBooking(response.data)
  }
}
